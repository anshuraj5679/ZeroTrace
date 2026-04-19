function patchWasmModuleImport(config, isServer) {
  config.experiments = Object.assign(config.experiments || {}, {
    asyncWebAssembly: true,
    layers: true,
    topLevelAwait: true
  });

  config.module.rules.push({
    test: /\.wasm$/,
    type: "asset/resource"
  });

  config.output.webassemblyModuleFilename = isServer
    ? "./../static/wasm/[modulehash].wasm"
    : "static/wasm/[modulehash].wasm";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cofhe/sdk"],
  webpack: (config, { isServer }) => {
    patchWasmModuleImport(config, isServer);

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false
    };

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false
    };

    if (!isServer) {
      config.output.environment = {
        ...(config.output.environment || {}),
        asyncFunction: true
      };
    }

    return config;
  }
};

module.exports = nextConfig;
