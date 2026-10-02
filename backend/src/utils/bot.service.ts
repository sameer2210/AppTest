import { CHESS_BOTS as BOTS } from "../constants/index.js";


class BotService {
  /**
   * Selects a random bot from the available list.
   * @returns {{id: string, name: string, type: string}} A random bot object.
   */
  static selectRandomBot() {
    return BOTS[Math.floor(Math.random() * BOTS.length)];
  }

  /**
   * Finds a bot by its unique ID.
   * @param {string} botId - The ID of the bot to find (e.g. 'bot_pawn').
   * @returns {{id: string, name: string, type: string} | null}
   */
  static getBotById(botId: string) {
    return BOTS.find((bot) => bot.id === botId) || null;
  }

  /**
   * Display name from a bot uid such as `bot_pawn` or `bot_pawn_0`.
   * @param {string} uid
   * @returns {string}
   */
  static displayNameFromUid(uid: string) {
    const raw = String(uid || "").replace(/^bot_/i, "");
    const type = raw.split("_")[0]?.toLowerCase() || "";
    const bot = BOTS.find((b) => b.type.toLowerCase() === type);
    return bot?.name || "Opponent";
  }
}

export default BotService;
