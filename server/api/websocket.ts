export default defineEventHandler(async (event) => {
  return $fetch('../html/websocket.html');
});
