#ifndef ELECTRON_SHELL_COMMON_ASAR_FILE_H_
#define ELECTRON_SHELL_COMMON_ASAR_FILE_H_

#include <cstdio>
#include <string>

class FileReader {
private:
    FILE* file;
    std::string filename;

public:
    // Constructor
    FileReader() : file(nullptr) {}

    // Destructor - ensure file is closed
    ~FileReader() {
        if (file != nullptr) {
            close();
        }
    }

    // Open file for reading
    bool open(const std::string& filepath) {
        // Close existing file if open
        if (file != nullptr) {
            close();
        }

        filename = filepath;
        file = fopen(filepath.c_str(), "rb");
        return file != nullptr;
    }

    // Check if file is open
    bool is_open() const {
        return file != nullptr;
    }

    // Close the file
    void close() {
        if (file != nullptr) {
            fclose(file);
            file = nullptr;
        }
    }

    // Read data from file
    // Returns number of bytes actually read
    size_t read(void* buffer, size_t size) {
        if (file == nullptr) {
            return 0;
        }
        return fread(buffer, 1, size, file);
    }

    // Seek to position in file
    // whence: SEEK_SET (beginning), SEEK_CUR (current), SEEK_END (end)
    bool seek(long offset, int whence = SEEK_SET) {
        if (file == nullptr) {
            return false;
        }
        return fseek(file, offset, whence) == 0;
    }

    // Get current position in file
    long tell() const {
        if (file == nullptr) {
            return -1;
        }
        return ftell(file);
    }

    // Check if end of file reached
    bool eof() const {
        if (file == nullptr) {
            return true;
        }
        return feof(file) != 0;
    }

    // Get file size
    long size() {
        if (file == nullptr) {
            return -1;
        }

        long current_pos = ftell(file);
        if (current_pos == -1) {
            return -1;
        }

        if (fseek(file, 0, SEEK_END) != 0) {
            return -1;
        }

        long file_size = ftell(file);

        // Restore original position
        fseek(file, current_pos, SEEK_SET);

        return file_size;
    }

    // Get filename
    const std::string& get_filename() const {
        return filename;
    }

    // Get file descriptor
    int get_fd() const {
        if (file == nullptr) {
            return -1;
        }
        return fileno(file);
    }
};

#endif // ELECTRON_SHELL_COMMON_ASAR_FILE_H_