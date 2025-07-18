#ifndef ELECTRON_SHELL_COMMON_LOGGER_H_
#define ELECTRON_SHELL_COMMON_LOGGER_H_

#include <iostream>


#define LOG_INFO(msg) \
    do { \
        std::cout << "[ASAR_INFO] " << msg << std::endl; \
    } while (0)

#define LOG_WARNING(msg) \
    do { \
        std::cerr << "[ASAR_WARNING] " << msg << std::endl; \
    } while (0)

#define LOG_ERROR(msg) \
    do { \
        std::cerr << "[ASAR_ERROR] " << msg << std::endl; \
    } while (0)


#endif // ELECTRON_SHELL_COMMON_LOGGER_H_