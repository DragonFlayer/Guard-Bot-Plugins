import type { ExtendedContext } from "../typings/context";
import Telegraf = require("telegraf");
import HtmlUtils = require("../utils/html");
import TgUtils = require("../utils/tg");
import Log = require("../utils/log");

let active = false; // If True, all new members will be kicked.
const kickCooldown = 300; // Time before a kicked user can attempt to join the chat again in 5 minutes (300 seconds) by default.
const feedback = false; // If True, it will post a message detailing why the user was removed.

const { Composer: C } = Telegraf;
const { html } = HtmlUtils;
const { link } = TgUtils;
const { logError } = Log;

export = C.mount("message", async (ctx: ExtendedContext, next) => {
    if (ctx.message?.entities?.[0].type === "bot_command") {
        const text = ctx.message?.text;
        const match = text.match(/^\/([^\s]+)\s?(.+)?/);
        let args = [];
        let command = "";
        if (match !== null) {
            if (match[1]) {
                command = match[1];
            }
            if (match[2]) {
                args = match[2].split(' ');
            }
        }

        if (command === "raidmode") {
            const member = await ctx.getChatMember(ctx.from?.id);
            if (member && (member.status === 'creator' || member.status === 'administrator')) {
                if (args !== null) {
                    if (args[0] === "on") {
                        active = true;
                        ctx.replyWithHTML(
                            html`Raid Mode is now On.`
                        );
                    } else if (args[0] === "off") {
                        active = false;
                        ctx.replyWithHTML(
                            html`Raid Mode is now Off.`
                        );
                    }
                }
            }
            ctx.deleteMessage(ctx.message?.message_id);
        }
    }

    const members = ctx.message?.new_chat_members?.filter(
        (x) => x.username !== ctx.me
    );
    if (!members || members.length === 0) {
        return next();
    }

    return Promise.all(
        members.map(async (x) => {
            if (active) {
                if (feedback) {
                    ctx.replyWithHTML(
                        html`User ${link(x)} has been kicked due to the chat being in Raid Mode.`
                    );
                }
                ctx.kickChatMember(x.id, Math.floor((Date.now() / 1000) + kickCooldown));
            } else {
                return next();
            }
        })
    ).catch((err) => logError("[raidmode] " + err.message));
});