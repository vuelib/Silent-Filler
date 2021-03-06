const path = require('path')

module.exports = {
  configureWebpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      game: path.resolve(__dirname, 'src/pixi-core/'),
      webcomponents: path.resolve(__dirname, 'src/components/')
    }
    config.devtool = 'source-map'
  },
  css: {
    loaderOptions: {
      scss: {
        prependData: '@import "@/styles/styles.scss";'
      }
    }
  }
}
