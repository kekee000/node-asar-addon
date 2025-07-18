// Copyright (c) 2014 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include <napi.h>
#include <vector>
#include <string>
#include <memory>
#include <filesystem>
#include <fstream>
#include <optional>
#include <unordered_map>
#include <cstdint>
#include "../asar/archive.h"
#include "../asar/asar_util.h"

namespace fs = std::filesystem;

// N-API wrapper class
class ArchiveWrapper : public Napi::ObjectWrap<ArchiveWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function func = DefineClass(env, "Archive", {
            InstanceMethod("getFileInfo", &ArchiveWrapper::GetFileInfo),
            InstanceMethod("stat", &ArchiveWrapper::Stat),
            InstanceMethod("readdir", &ArchiveWrapper::Readdir),
            InstanceMethod("realpath", &ArchiveWrapper::Realpath),
            InstanceMethod("copyFileOut", &ArchiveWrapper::CopyFileOut),
            InstanceMethod("getFdAndValidateIntegrityLater", &ArchiveWrapper::GetFD),
            InstanceAccessor("archivePath", &ArchiveWrapper::GetArchivePath, nullptr),
        });

        Napi::FunctionReference* constructor = new Napi::FunctionReference();
        *constructor = Napi::Persistent(func);
        env.SetInstanceData(constructor);

        exports.Set("Archive", func);
        return exports;
    }

    ArchiveWrapper(const Napi::CallbackInfo& info)
        : Napi::ObjectWrap<ArchiveWrapper>(info) {

        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(info.Env(), "Path must be a string").ThrowAsJavaScriptException();
            return;
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        archive_ = asar::GetOrCreateAsarArchive(path);
        if (!archive_) {
            Napi::Error::New(info.Env(), "Failed to initialize archive").ThrowAsJavaScriptException();
            return;
        }
    }

private:
    std::shared_ptr<asar::Archive> archive_;

    Napi::Value GetFileInfo(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            return env.Null();
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        asar::Archive::FileInfo file_info;
        if (!archive_ || !archive_->GetFileInfo(path, &file_info)) {
            return env.Null();
        }

        Napi::Object result = Napi::Object::New(env);
        result.Set("size", Napi::Number::New(env, file_info.size));
        result.Set("unpacked", Napi::Boolean::New(env, file_info.unpacked));
        result.Set("offset", Napi::Number::New(env, file_info.offset));

        if (file_info.integrity.has_value()) {
            Napi::Object integrity = Napi::Object::New(env);
            const auto& integrity_info = file_info.integrity.value();

            switch (integrity_info.algorithm) {
                case asar::HashAlgorithm::kSHA256:
                    integrity.Set("algorithm", Napi::String::New(env, "SHA256"));
                    break;
                case asar::HashAlgorithm::kNone:
                    integrity.Set("algorithm", Napi::String::New(env, "none"));
                    break;
            }

            integrity.Set("hash", Napi::String::New(env, integrity_info.hash));
            result.Set("integrity", integrity);
        }

        return result;
    }

    Napi::Value Stat(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            return env.Null();
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        asar::Archive::Stats stats;
        if (!archive_ || !archive_->Stat(path, &stats)) {
            return env.Null();
        }

        Napi::Object result = Napi::Object::New(env);
        result.Set("size", Napi::Number::New(env, stats.size));
        result.Set("offset", Napi::Number::New(env, stats.offset));
        result.Set("type", Napi::Number::New(env, static_cast<int>(stats.type)));

        return result;
    }

    Napi::Value Readdir(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            return env.Null();
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        std::vector<fs::path> files;
        if (!archive_ || !archive_->Readdir(path, &files)) {
            return env.Null();
        }

        Napi::Array result = Napi::Array::New(env, files.size());
        for (size_t i = 0; i < files.size(); ++i) {
            result[i] = Napi::String::New(env, files[i].string());
        }

        return result;
    }

    Napi::Value Realpath(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            return env.Null();
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        fs::path realpath;
        if (!archive_ || !archive_->Realpath(path, &realpath)) {
            return env.Null();
        }

        return Napi::String::New(env, realpath.string());
    }

    Napi::Value CopyFileOut(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            return env.Null();
        }

        std::string path_str = info[0].As<Napi::String>();
        fs::path path(path_str);

        fs::path new_path;
        if (!archive_ || !archive_->CopyFileOut(path, &new_path)) {
            return env.Null();
        }

        return Napi::String::New(env, new_path.string());
    }

    Napi::Value GetFD(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        int fd = archive_ ? archive_->GetUnsafeFD() : -1;
        return Napi::Number::New(env, fd);
    }

    Napi::Value GetArchivePath(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        return Napi::String::New(env, archive_ ? archive_->path().string() : "");
    }
};

// Split path function
Napi::Value SplitPath(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        return env.Null();
    }

    std::string path_str = info[0].As<Napi::String>();
    fs::path path(path_str);

    Napi::Object result = Napi::Object::New(env);
    fs::path asar_path, file_path;

    if (asar::GetAsarArchivePath(path, &asar_path, &file_path, true)) {
        result.Set("isAsar", Napi::Boolean::New(env, true));
        result.Set("asarPath", Napi::String::New(env, asar_path.string()));
        result.Set("filePath", Napi::String::New(env, file_path.string()));
    } else {
        result.Set("isAsar", Napi::Boolean::New(env, false));
    }

    return result;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    ArchiveWrapper::Init(env, exports);
    exports.Set("splitPath", Napi::Function::New(env, SplitPath));
    return exports;
}

NODE_API_MODULE(electron_common_asar, Init)