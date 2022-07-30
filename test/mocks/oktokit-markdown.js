export const markdown = {
  render: async ({ mode, text }) => ({
    data: JSON.stringify({ markdown: true, mode, text }, null, 2),
  }),
};
