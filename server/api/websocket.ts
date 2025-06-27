export default defineEventHandler(async (event) => {
  return $fetch('https://raw.githubusercontent.com/h3js/crossws/refs/heads/main/playground/public/index.html');
});
