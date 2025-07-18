// Copyright (c) 2014 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ELECTRON_SHELL_COMMON_ASAR_ARCHIVE_H_
#define ELECTRON_SHELL_COMMON_ASAR_ARCHIVE_H_

#include <memory>
#include <optional>
#include <string>
#include <vector>
#include <uv.h>
#include <filesystem>
#include <fstream>
#include <nlohmann/json.hpp>
#include "./file.h"

namespace fs = std::filesystem;

namespace asar {

class ScopedTemporaryFile;

enum class HashAlgorithm {
  kSHA256,
  kNone,
};

struct IntegrityPayload {
  IntegrityPayload();
  ~IntegrityPayload();
  IntegrityPayload(const IntegrityPayload& other);
  HashAlgorithm algorithm = HashAlgorithm::kNone;
  std::string hash;
  uint32_t block_size = 0U;
  std::vector<std::string> blocks;
};

// This class represents an asar package, and provides methods to read
// information from it. It is thread-safe after |Init| has been called.
class Archive {
 public:
  struct FileInfo {
    FileInfo();
    ~FileInfo();
    bool unpacked = false;
    bool executable = false;
    uint32_t size = 0U;
    uint64_t offset = 0U;
    std::optional<IntegrityPayload> integrity;
  };

  enum class FileType {
    kFile = UV_DIRENT_FILE,
    kDirectory = UV_DIRENT_DIR,
    kLink = UV_DIRENT_LINK,
  };

  struct Stats : public FileInfo {
    FileType type = FileType::kFile;
  };

  explicit Archive(const fs::path& path);
  virtual ~Archive();

  // disable copy
  Archive(const Archive&) = delete;
  Archive& operator=(const Archive&) = delete;

  // Read and parse the header.
  bool Init();

  std::optional<IntegrityPayload> HeaderIntegrity() const;
  std::optional<fs::path> RelativePath() const;

  // Get the info of a file.
  bool GetFileInfo(const fs::path& path, FileInfo* info) const;

  // Fs.stat(path).
  bool Stat(const fs::path& path, Stats* stats) const;

  // Fs.readdir(path).
  bool Readdir(const fs::path& path,
               std::vector<fs::path>* files) const;

  // Fs.realpath(path).
  bool Realpath(const fs::path& path, fs::path* realpath) const;

  // Copy the file into a temporary file, and return the new path.
  // For unpacked file, this method will return its real path.
  bool CopyFileOut(const fs::path& path, fs::path* out);

  // Returns the file's fd.
  // Using this fd will not validate the integrity of any files
  // you read out of the ASAR manually.  Callers are responsible
  // for integrity validation after this fd is handed over.
  int GetUnsafeFD() const;

  fs::path path() const { return path_; }

 private:
  std::filesystem::path path_;
  FileReader file_;
  int fd_ = -1;

  bool initialized_ = false;
  uint32_t header_size_ = 0;
  bool header_validated_ = false;
  nlohmann::json header_;

  std::mutex external_files_lock_;
  std::unordered_map<std::string, std::unique_ptr<ScopedTemporaryFile>> external_files_;
};

}  // namespace asar

#endif  // ELECTRON_SHELL_COMMON_ASAR_ARCHIVE_H_
