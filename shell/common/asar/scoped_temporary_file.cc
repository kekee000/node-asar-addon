// Copyright (c) 2014 GitHub, Inc.
// Use of this source code is governed by the MIT license that can be
// found in the LICENSE file.

#include "scoped_temporary_file.h"

#include <vector>
#include <fstream>
#include <filesystem>
#include <random>
#include <sstream>
#include <iomanip>

#if defined(_WIN32)
#include <windows.h>
#include <io.h>
#else
#include <unistd.h>
#include <cstdlib>
#endif

#include "./asar_util.h"

namespace asar {

ScopedTemporaryFile::ScopedTemporaryFile() = default;

ScopedTemporaryFile::~ScopedTemporaryFile() {
  if (!path_.empty()) {
    std::error_code ec;
#if defined(_WIN32)
    // On Windows, schedule file for deletion after reboot if it can't be deleted now
    if (!std::filesystem::remove(path_, ec)) {
      // Convert to wide string for Windows API
      std::wstring wide_path = path_.wstring();
      MoveFileExW(wide_path.c_str(), nullptr, MOVEFILE_DELAY_UNTIL_REBOOT);
    }
#else
    std::filesystem::remove(path_, ec);
#endif
  }
}

bool ScopedTemporaryFile::Init(const std::filesystem::path::string_type& ext) {
  if (!path_.empty())
    return true;

  std::error_code ec;

  // Get temporary directory
  std::filesystem::path temp_dir = std::filesystem::temp_directory_path(ec);
  if (ec) {
    return false;
  }

  // Generate unique filename
  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_int_distribution<> dis(0, 15);

  const char* hex_chars = "0123456789abcdef";
  std::string random_name = "temp_";
  for (int i = 0; i < 16; ++i) {
    random_name += hex_chars[dis(gen)];
  }

  path_ = temp_dir / random_name;

#if defined(_WIN32)
  // Keep the original extension on Windows
  if (!ext.empty()) {
    path_ += ext;
  }
#endif

  // Create the file
  std::ofstream file(path_, std::ios::binary);
  if (!file.is_open()) {
    path_.clear();
    return false;
  }
  file.close();

  return true;
}

// Alternative implementation using file descriptor/handle for better compatibility
bool ScopedTemporaryFile::InitFromFile(
    int src_fd,
    const std::filesystem::path::string_type& ext,
    uint64_t offset,
    uint64_t size,
    const std::optional<IntegrityPayload>& integrity) {

  if (src_fd < 0) {
    return false;
  }

  if (!Init(ext)) {
    return false;
  }

  // Read data from source file descriptor
  std::vector<uint8_t> buf(size);

#if defined(_WIN32)
  // Seek to offset
  if (_lseeki64(src_fd, offset, SEEK_SET) == -1) {
    return false;
  }

  // Read data
  int bytes_read = _read(src_fd, buf.data(), static_cast<unsigned int>(size));
  if (bytes_read != static_cast<int>(size)) {
    return false;
  }
#else
  // Seek to offset
  if (lseek(src_fd, offset, SEEK_SET) == -1) {
    return false;
  }

  // Read data
  ssize_t bytes_read = read(src_fd, buf.data(), size);
  if (bytes_read != static_cast<ssize_t>(size)) {
    return false;
  }
#endif

  // Validate integrity if provided
  if (integrity) {
    std::string_view sv(reinterpret_cast<const char*>(buf.data()), size);
    ValidateIntegrityOrDie(sv, *integrity);
  }

  // Write to destination file
  std::ofstream dest(path_, std::ios::binary);
  if (!dest.is_open()) {
    return false;
  }

  dest.write(reinterpret_cast<const char*>(buf.data()), size);
  if (dest.fail()) {
    return false;
  }

  dest.close();
  return !dest.fail();
}

}  // namespace asar