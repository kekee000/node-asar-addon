// Copyright (c) 2014 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "archive.h"

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <iostream>
#include <fcntl.h> // For open()
#include <unistd.h> // For read(), close()
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>
#include <vector>

#include "nlohmann/json.hpp"

#if defined(_WIN32)
#include <io.h>
#include <fcntl.h>
#include <sys/stat.h>
#else
#include <unistd.h>
#include <sys/stat.h>
#endif

#include "./logger.h"
#include "./scoped_temporary_file.h"

namespace asar {

namespace {

#if defined(_WIN32)
const char kSeparators[] = "\\/";
#else
const char kSeparators[] = "/";
#endif

const nlohmann::json* GetNodeFromPath(std::string path, const nlohmann::json& root);

// Gets the "files" from "dir".
const nlohmann::json* GetFilesNode(const nlohmann::json& root, const nlohmann::json& dir) {
  // Test for symbol linked directory.
  if (dir.contains("link") && dir["link"].is_string()) {
    const std::string& link = dir["link"].get<std::string>();
    const nlohmann::json* linked_node = GetNodeFromPath(link, root);
    if (!linked_node || !linked_node->contains("files"))
      return nullptr;
    return &(*linked_node)["files"];
  }

  if (dir.contains("files") && dir["files"].is_object()) {
    return &dir["files"];
  }
  return nullptr;
}

// Gets sub-file "name" from "dir".
const nlohmann::json* GetChildNode(const nlohmann::json& root,
                                   const std::string& name,
                                   const nlohmann::json& dir) {
  if (name.empty())
    return &root;

  const nlohmann::json* files = GetFilesNode(root, dir);
  if (!files || !files->contains(name))
    return nullptr;

  return &(*files)[name];
}

// Gets the node of "path" from "root".
const nlohmann::json* GetNodeFromPath(std::string path, const nlohmann::json& root) {
  if (path.empty())
    return &root;

  const nlohmann::json* dir = &root;
  for (size_t delimiter_position = path.find_first_of(kSeparators);
       delimiter_position != std::string::npos;
       delimiter_position = path.find_first_of(kSeparators)) {
    const nlohmann::json* child = GetChildNode(root, path.substr(0, delimiter_position), *dir);
    if (!child)
      return nullptr;

    dir = child;
    path.erase(0, delimiter_position + 1);
  }

  return GetChildNode(root, path, *dir);
}

bool FillFileInfoWithNode(Archive::FileInfo* info,
                          uint32_t header_size,
                          bool load_integrity,
                          const nlohmann::json* node) {
  if (node->contains("size") && (*node)["size"].is_number_unsigned()) {
    info->size = (*node)["size"].get<uint32_t>();
  } else {
    return false;
  }

  if (node->contains("unpacked") && (*node)["unpacked"].is_boolean()) {
    info->unpacked = (*node)["unpacked"].get<bool>();
    if (info->unpacked) {
      return true;
    }
  }

  if (node->contains("offset") && (*node)["offset"].is_string()) {
    const std::string& offset_str = (*node)["offset"].get<std::string>();
    info->offset = std::stoull(offset_str) + header_size;
  }
  else {
    return false;
  }

  if (node->contains("executable") && (*node)["executable"].is_boolean()) {
    info->executable = (*node)["executable"].get<bool>();
  }

  // Note: Integrity validation is platform-specific and would need
  // appropriate crypto library integration in a real implementation
  if (load_integrity && node->contains("integrity") && (*node)["integrity"].is_object()) {
    const auto& integrity = (*node)["integrity"];
    if (integrity.contains("algorithm") && integrity["algorithm"].is_string() &&
        integrity.contains("hash") && integrity["hash"].is_string() &&
        integrity.contains("blockSize") && integrity["blockSize"].is_number() &&
        integrity.contains("blocks") && integrity["blocks"].is_array()) {

      IntegrityPayload integrity_payload;
      integrity_payload.hash = integrity["hash"].get<std::string>();
      integrity_payload.block_size = integrity["blockSize"].get<uint32_t>();

      for (const auto& block : integrity["blocks"]) {
        if (block.is_string()) {
          integrity_payload.blocks.push_back(block.get<std::string>());
        } else {
          LOG_ERROR("Invalid block integrity value for file in ASAR archive");
          return false;
        }
      }

      if (integrity["algorithm"].get<std::string>() == "SHA256") {
        integrity_payload.algorithm = HashAlgorithm::kSHA256;
        info->integrity = std::move(integrity_payload);
      }
    }

    if (!info->integrity.has_value()) {
      LOG_ERROR("Failed to read integrity for file in ASAR archive");
      return false;
    }
  }

  return true;
}

// Simple pickle-like binary data reader
#define PICKLE_HEADER_SIZE 4
class PickleReader {
private:
  const uint8_t* data_;
  size_t size_;
  // pickle header size is 4 bytes
  size_t pos_;

public:
  PickleReader(const std::vector<uint8_t>& data)
    : data_(data.data()), size_(data.size()), pos_(PICKLE_HEADER_SIZE) {}

  bool ReadUInt32(uint32_t* value) {
    // memcpy
    if (pos_ + sizeof(uint32_t) > size_) return false;
    const uint8_t* current_read_ptr = data_ + pos_;
    std::memcpy(value, current_read_ptr, sizeof(uint32_t));
    pos_ += sizeof(uint32_t);
    return true;
  }

  bool ReadString(std::string* value) {
    uint32_t length;
    if (!ReadUInt32(&length)) return false;
    if (pos_ + length > size_) return false;

    value->assign(reinterpret_cast<const char*>(data_ + pos_), length);
    pos_ += length;
    return true;
  }
};

}  // namespace

IntegrityPayload::IntegrityPayload() = default;
IntegrityPayload::~IntegrityPayload() = default;
IntegrityPayload::IntegrityPayload(const IntegrityPayload& other) = default;

Archive::FileInfo::FileInfo() = default;
Archive::FileInfo::~FileInfo() = default;

Archive::Archive(const std::filesystem::path& path) : path_(path) {
  file_.open(path_.string());
  if (file_.is_open()) {
    fd_ = file_.get_fd();
  }
}

Archive::~Archive() {
  if (file_.is_open()) {
    file_.close();
  }
}

#define ARCHIVE_HEADER_SIZE 8

bool Archive::Init() {
  // Should only be initialized once
  assert(!initialized_);
  initialized_ = true;

  if (!file_.is_open()) {
    LOG_ERROR("Failed to open file: " + path_.string());
    return false;
  }

  // Read header size (first 8 bytes)
  std::vector<uint8_t> size_buf(ARCHIVE_HEADER_SIZE);
  size_t size = file_.read(reinterpret_cast<char*>(size_buf.data()), ARCHIVE_HEADER_SIZE);
  if (size < ARCHIVE_HEADER_SIZE) {
    LOG_ERROR("Failed to read header size from " + path_.string());
    return false;
  }

  PickleReader size_reader(size_buf);
  uint32_t header_size;
  if (!size_reader.ReadUInt32(&header_size)) {
    LOG_ERROR("Failed to parse header size from " + path_.string());
    return false;
  }

  // Read header content
  std::vector<uint8_t> header_buf(header_size);
  size = file_.read(reinterpret_cast<char*>(header_buf.data()), header_size);
  if (size < header_size) {
    LOG_ERROR("Failed to read header from " + path_.string());
    return false;
  }
  PickleReader header_reader(header_buf);
  std::string header_str;
  if (!header_reader.ReadString(&header_str)) {
    LOG_ERROR("Failed to parse header size from " + path_.string());
    return false;
  }
  // Parse JSON header
  header_ = nlohmann::json::parse(header_str, nullptr, false);
  if (header_.is_discarded())
  {
      LOG_ERROR("parse error: " + path_.string());
      return false;
  }

  header_size_ = ARCHIVE_HEADER_SIZE + header_size;
  return true;
}

std::optional<IntegrityPayload> Archive::HeaderIntegrity() const {
  return std::nullopt; // Placeholder - would need crypto implementation
}

std::optional<std::filesystem::path> Archive::RelativePath() const {
  return std::nullopt; // Placeholder
}

bool Archive::GetFileInfo(const std::filesystem::path& path, FileInfo* info) const {
  if (header_.is_null())
    return false;

  const nlohmann::json* node = GetNodeFromPath(path.string(), header_);
  if (!node)
    return false;

  if (node->contains("link") && (*node)["link"].is_string()) {
    const std::string& link = (*node)["link"].get<std::string>();
    return GetFileInfo(std::filesystem::path(link), info);
  }

  return FillFileInfoWithNode(info, header_size_, header_validated_, node);
}

bool Archive::Stat(const std::filesystem::path& path, Stats* stats) const {
  if (header_.is_null())
    return false;

  const nlohmann::json* node = GetNodeFromPath(path.string(), header_);
  if (!node)
    return false;

  if (node->contains("link")) {
    stats->type = FileType::kLink;
    return true;
  }

  if (node->contains("files")) {
    stats->type = FileType::kDirectory;
    return true;
  }

  return FillFileInfoWithNode(stats, header_size_, header_validated_, node);
}

bool Archive::Readdir(const std::filesystem::path& path,
                      std::vector<std::filesystem::path>* files) const {
  if (header_.is_null())
    return false;

  const nlohmann::json* node = GetNodeFromPath(path.string(), header_);
  if (!node)
    return false;

  const nlohmann::json* files_node = GetFilesNode(header_, *node);
  if (!files_node)
    return false;

  for (const auto& [key, value] : files_node->items()) {
    files->push_back(std::filesystem::path(key));
  }
  return true;
}

bool Archive::Realpath(const std::filesystem::path& path,
                       std::filesystem::path* realpath) const {
  if (header_.is_null())
    return false;

  const nlohmann::json* node = GetNodeFromPath(path.string(), header_);
  if (!node)
    return false;

  if (node->contains("link") && (*node)["link"].is_string()) {
    const std::string& link = (*node)["link"].get<std::string>();
    *realpath = std::filesystem::path(link);
    return true;
  }

  *realpath = path;
  return true;
}

bool Archive::CopyFileOut(const std::filesystem::path& path, std::filesystem::path* out) {
  if (header_.is_null())
    return false;

  std::lock_guard<std::mutex> lock(external_files_lock_);

  auto it = external_files_.find(path.string());
  if (it != external_files_.end()) {
    *out = it->second->path();
    return true;
  }

  FileInfo info;
  if (!GetFileInfo(path, &info))
    return false;

  if (info.unpacked) {
    *out = path_;
    *out += ".unpacked";
    *out /= path;
    return true;
  }

  auto temp_file = std::make_unique<ScopedTemporaryFile>();
  std::string ext = path.extension().string();
  if (!temp_file->InitFromFile(fd_, ext, info.offset, info.size, info.integrity))
    return false;

#if !defined(_WIN32)
  if (info.executable) {
    // chmod a+x temp_file
    chmod(temp_file->path().c_str(), 0755);
  }
#endif

  *out = temp_file->path();
  external_files_[path.string()] = std::move(temp_file);
  return true;
}

int Archive::GetUnsafeFD() const {
  return fd_;
}

}  // namespace asar