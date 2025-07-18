{
  "target_defaults": {
      "cflags_cc": [
          "-fpermissive",
          "-Wno-unused",
          "-Wno-conversion-null",
          "-Wno-literal-suffix",
          "-Wno-parentheses",
          "-fexceptions",
          "-g",
          "-std=c++17"
      ],
      "cflags_cc!": [
          "-fno-exceptions",
          "-fno-rtti",
          "-std=gnu++1y"
      ],
      "include_dirs": [
          "<!@(node -p 'require(\"node-addon-api\").include')",
          "shell",
      ]
  },
  "targets": [
    {
      "target_name": "asar_addon",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS', 'NODE_API_SWALLOW_UNTHROWABLE_EXCEPTIONS' ],
      "sources": [
          "<!@(find shell -name \"*.cc\")",
      ],
    }
  ]
}
