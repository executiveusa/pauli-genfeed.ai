const path = require('node:path');
const createWebpackConfig = require('../../../webpack.base.config');

const config = createWebpackConfig({
  appDir: __dirname,
  appName: 'notifications',
  distPath: 'apps/notifications',
  distRoot: path.resolve(__dirname, '..'),
  nodeModulesDir: path.resolve(__dirname, '../../../node_modules'),
});

// The monorepo source alias '@slack' -> ../slack/src (generated for every
// server app by webpack.base.config) collides with the npm @slack scope.
// notifications imports only the real npm package (@slack/web-api), never a
// monorepo self-alias, so drop the alias for this app's bundle.
delete config.resolve.alias['@slack'];

// node-pty loads its native binding relative to the real package at runtime;
// under bun's isolated store the default externals emit an absolute build-host
// path. Pin a bare commonjs external so runtime resolves 'node-pty' normally.
config.externals.unshift({ 'node-pty': 'commonjs node-pty' });

module.exports = config;
