export default defineEventHandler(async (event) => {
  return $fetch('https://raw.githubusercontent.com/Fahze/S-Quizz-It_back/refs/heads/sessions/server/html/websocket.html');
});
