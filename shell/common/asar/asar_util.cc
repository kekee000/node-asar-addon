// Copyright (c) 2015 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "asar_util.h"

#include <map>
#include <memory>
#include <string>
#include <filesystem>
#include <fstream>
#include <mutex>
#include <thread>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include <cstdint>
#include <span>
#include <iostream>
#include <openssl/sha.h>

#include "./logger.h"
#include "./archive.h"
#include "./asar_util.h"

namespace asar {

namespace {

using ArchiveMap = std::map<std::filesystem::path, std::shared_ptr<Archive>>;

const std::string kAsarExtension = ".asar";

std::mutex& GetDirectoryCacheMutex() {
    static std::mutex mutex;
    return mutex;
}

std::map<std::filesystem::path, bool>& GetDirectoryCache() {
    static std::map<std::filesystem::path, bool> cache;
    return cache;
}

bool IsDirectoryCached(const std::filesystem::path& path) {
    std::lock_guard<std::mutex> lock(GetDirectoryCacheMutex());
    auto& cache = GetDirectoryCache();

    auto it = cache.find(path);
    if (it != cache.end()) {
        return it->second;
    }

    std::error_code ec;
    bool is_directory = std::filesystem::is_directory(path, ec);
    return cache[path] = (is_directory && !ec);
}

ArchiveMap& GetArchiveCache() {
    static ArchiveMap archive_map;
    return archive_map;
}

std::mutex& GetArchiveCacheMutex() {
    static std::mutex mutex;
    return mutex;
}

std::string ToHexString(const std::vector<uint8_t>& data) {
    std::stringstream ss;
    ss << std::hex << std::setfill('0');
    for (uint8_t byte : data) {
        ss << std::setw(2) << static_cast<int>(byte);
    }
    return ss.str();
}

std::string ToLowerCase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::vector<uint8_t> Sha256Hash(std::string_view data) {
    std::vector<uint8_t> hash(SHA256_DIGEST_LENGTH);
    SHA256(reinterpret_cast<const unsigned char*>(data.data()), data.size(), hash.data());
    return hash;
}

}  // namespace

std::shared_ptr<Archive> GetOrCreateAsarArchive(const std::filesystem::path& path) {
    std::lock_guard<std::mutex> lock(GetArchiveCacheMutex());
    ArchiveMap& map = GetArchiveCache();

    // if we have it, return it
    const auto lower = map.lower_bound(path);
    if (lower != map.end() && lower->first == path) {
        return lower->second;
    }

    // if we can create it, return it
    auto archive = std::make_shared<Archive>(path);
    if (archive->Init()) {
        map.try_emplace(lower, path, archive);
        return archive;
    }

    // didn't have it, couldn't create it
    return nullptr;
}

bool GetAsarArchivePath(const std::filesystem::path& full_path,
                        std::filesystem::path* asar_path,
                        std::filesystem::path* relative_path,
                        bool allow_root) {
    std::filesystem::path iter = full_path;

    while (true) {
        std::filesystem::path dirname = iter.parent_path();

        if (iter.extension() == kAsarExtension && !IsDirectoryCached(iter)) {
            break;
        } else if (iter == dirname) {
            return false;
        }
        iter = dirname;
    }

    std::filesystem::path tail;
    std::error_code ec;

    if (allow_root && iter == full_path) {
        tail = "";
    } else {
        tail = std::filesystem::relative(full_path, iter, ec);
        if (ec) {
            return false;
        }
    }

    *asar_path = iter;
    *relative_path = tail;
    return true;
}

bool ReadFileToString(const std::filesystem::path& path, std::string* contents) {
    std::filesystem::path asar_path, relative_path;
    if (!GetAsarArchivePath(path, &asar_path, &relative_path)) {
        // Fall back to regular file reading
        std::ifstream file(path, std::ios::binary);
        if (!file.is_open()) {
            return false;
        }

        file.seekg(0, std::ios::end);
        size_t size = file.tellg();
        file.seekg(0, std::ios::beg);

        contents->resize(size);
        file.read(contents->data(), size);

        return file.good() || file.eof();
    }

    std::shared_ptr<Archive> archive = GetOrCreateAsarArchive(asar_path);
    if (!archive) {
        return false;
    }

    Archive::FileInfo info;
    if (!archive->GetFileInfo(relative_path, &info)) {
        return false;
    }

    if (info.unpacked) {
        std::filesystem::path real_path;
        // For unpacked file it will return the real path instead of doing the copy.
        archive->CopyFileOut(relative_path, &real_path);
        return ReadFileToString(real_path, contents);
    }

    std::ifstream src(asar_path, std::ios::binary);
    if (!src.is_open()) {
        return false;
    }

    contents->resize(info.size);
    src.seekg(info.offset);
    src.read(contents->data(), info.size);

    if (!src.good() && !src.eof()) {
        return false;
    }

    if (info.integrity) {
        ValidateIntegrityOrDie(std::string_view(
            (contents->data()),
            contents->size()), *info.integrity);
    }

    return true;
}

void ValidateIntegrityOrDie(std::string_view input, const IntegrityPayload& integrity) {
    if (integrity.algorithm == HashAlgorithm::kSHA256) {
        const std::vector<uint8_t> hash_bytes = Sha256Hash(input);
        const std::string hex_hash = ToLowerCase(ToHexString(hash_bytes));

        if (integrity.hash != hex_hash) {
            LOG_ERROR("Integrity check failed for asar archive (" + integrity.hash + " vs " + hex_hash + ")");
            std::abort();
        }
    } else {
        LOG_ERROR("Unsupported hashing algorithm  in ValidateIntegrityOrDie");
        std::abort();
    }
}

}  // namespace asar