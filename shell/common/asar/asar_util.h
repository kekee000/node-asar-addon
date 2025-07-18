// Copyright (c) 2015 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ELECTRON_SHELL_COMMON_ASAR_ASAR_UTIL_H_
#define ELECTRON_SHELL_COMMON_ASAR_ASAR_UTIL_H_

#include <memory>
#include <string>
#include <filesystem>
namespace fs = std::filesystem;
namespace asar {

class Archive;
struct IntegrityPayload;

// Gets or creates and caches a new Archive from the path.
std::shared_ptr<Archive> GetOrCreateAsarArchive(const fs::path& path);

// Separates the path to Archive out.
bool GetAsarArchivePath(const fs::path& full_path,
                        fs::path* asar_path,
                        fs::path* relative_path,
                        bool allow_root = false);

// Same with base::ReadFileToString but supports asar Archive.
bool ReadFileToString(const fs::path& path, std::string* contents);

void ValidateIntegrityOrDie(std::string_view input,
                            const IntegrityPayload& integrity);

}  // namespace asar

#endif  // ELECTRON_SHELL_COMMON_ASAR_ASAR_UTIL_H_
