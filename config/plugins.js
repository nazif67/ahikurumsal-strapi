module.exports = ({ env }) => ({
  upload: {
    config: {
      sizeLimit: 10 * 1024 * 1024,
    },
  },
});
