// Copyright (c) 2014 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#ifndef ELECTRON_SHELL_COMMON_ASAR_SCOPED_TEMPORARY_FILE_H_
#define ELECTRON_SHELL_COMMON_ASAR_SCOPED_TEMPORARY_FILE_H_

#include <filesystem>
#include <optional>
#include "./archive.h"

namespace asar {

// An object representing a temporary file that should be cleaned up when this
// object goes out of scope.  Note that since deletion occurs during the
// destructor, no further error handling is possible if the directory fails to
// be deleted.  As a result, deletion is not guaranteed by this class.
class ScopedTemporaryFile {
 public:
  ScopedTemporaryFile();
  ScopedTemporaryFile(const ScopedTemporaryFile&) = delete;
  ScopedTemporaryFile& operator=(const ScopedTemporaryFile&) = delete;
  virtual ~ScopedTemporaryFile();

  // Init an empty temporary file with a certain extension.
  bool Init(const std::filesystem::path::string_type& ext);

  // Init an temporary file and fill it with content of |path|.
  bool InitFromFile(
      int srcfd,
      const std::filesystem::path::string_type& ext,
      uint64_t offset,
      uint64_t size,
      const std::optional<IntegrityPayload>& integrity);

  fs::path path() const { return path_; }

 private:
  fs::path path_;
};

}  // namespace asar

#endif  // ELECTRON_SHELL_COMMON_ASAR_SCOPED_TEMPORARY_FILE_H_
