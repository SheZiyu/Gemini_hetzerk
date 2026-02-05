/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 处理 pdbe-molstar 的 Node.js 模块依赖
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // 忽略 h264-mp4-encoder 的警告
    config.module.rules.push({
      test: /h264-mp4-encoder/,
      use: 'null-loader',
    });

    return config;
  },
  // 转译 pdbe-molstar 包
  transpilePackages: ['pdbe-molstar', 'molstar'],
};

export default nextConfig;
