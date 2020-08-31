const { MongoClient, ObjectId, BSONType } = require("mongodb");
let params;
try {
  params = require("./params.json");
} catch {
  params = {};
}
const text = require("./text.json");

const Telegraf = require("telegraf");
const Extra = require("telegraf/extra");
const Markup = require("telegraf/markup");
const { Stage, session } = Telegraf;
const SceneGen = require("./Scenes");

const TOKEN = process.env.TOKEN || params.TOKEN;
const KEY = process.env.KEY || params.KEY;
const bot = new Telegraf(TOKEN);

const botName = "Мэд";
const basicFuncErr = (ctx) => sendMsg(ctx, text["error-msg"]);

const uri = `mongodb+srv://Node:${KEY}@cluster0-ttfss.mongodb.net/correct-mistakes-bot?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const funcs = {
  deleteMyAccount: async (ctx) => {
    await users.deleteOne({ userId: ctx.from.id });
    sendMsg(ctx, text["success"], ["/start"]);
  },

  cancelDeleting: async (ctx) => {
    sendMsg(ctx, text["cancel"], [text["menu-btn"]]);
  },
};

const curScenes = new SceneGen();
const gameScene = curScenes.GameScene();
const stage = new Stage([gameScene]);
bot.use(session());
bot.use(stage.middleware());

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;
  let candidate;

  try {
    candidate = await users.findOne({ userId });
  } catch {
    sendMsg(ctx, text["error-server"]);
  }

  if (candidate) {
    sendMsg(ctx, text["you-are-reged"], [
      [text["yes-delete-acc"], text["no-delete-acc"]],
    ]);
  } else {
    await users.insertOne({
      date: new Date().toLocaleString(),
      name: generateName(),
      userId,
      wins: 0,
    });

    sendMsg(ctx, text["start"].replace("name", botName), [text["ready-btn"]]);
  }
});

bot.on("message", async (ctx) => {
  const msg = ctx.message.text.toLowerCase();
  const userId = ctx.from.id;

  try {
    const candidate = await users.findOne({ userId });

    if (msg == text["ready-btn"].toLowerCase()) {
      sendMsg(ctx, text["ready"].replace("username", candidate.name), [
        text["menu-btn"],
      ]);
    } else if (msg == text["yes-delete-acc"].toLowerCase()) {
      funcs.deleteMyAccount(ctx);
    } else if (msg == text["no-delete-acc"].toLowerCase()) {
      funcs.cancelDeleting(ctx);
    } else if (msg == text["menu-btn"].toLowerCase() || msg == "/menu") {
      sendMsg(
        ctx,
        text["menu"]
          .replace("name", candidate.name)
          .replace("score", candidate.score || 0)
          .replace("hints", candidate.hints || 0)
          .replace("wins", candidate.wins || 0),
        [
          [text["menu-btn"], text["shop-btn"]],
          [text["in-game-btn"], text["leaders-btn"]],
        ]
      );
    } else if (msg == text["leaders-btn"].toLowerCase()) {
      const leaders = await users.find().sort({ wins: -1 }).limit(3).toArray();
      leaders.forEach((leader) => {
        sendMsg(ctx, `${leader.name}, ${leader.wins || 0} побед`, [
          text["menu-btn"],
        ]);
      });
    } else if (msg == text["in-game-btn"].toLowerCase()) {
      ctx.scene.enter("game");
    } else if (msg == text["shop-btn"].toLowerCase()) {
      sendMsg(ctx, "Выберите товар", [[text["one-hint"]], [text["menu-btn"]]]);
    } else if (msg == text["one-hint"].toLowerCase()) {
      if (candidate.score >= 60) {
        await users.updateOne(
          { userId },
          {
            $set: {
              score: (candidate.score || 0) - 60,
              hints: (candidate.hints || 0) + 1,
            },
          }
        );
        sendMsg(ctx, "Вы успешно купили +1 подсказку за 60 очков!", [
          text["menu-btn"],
        ]);
      } else {
        sendMsg(ctx, "У вас не достаточно очков", [text["menu-btn"]]);
      }
    } else if (msg.startsWith("/rename ")) {
      const name = msg.slice(8);
      await users.updateOne({ userId }, { $set: { name } });
      sendMsg(ctx, text["new-name"].replace("newname", name), [
        text["menu-btn"],
      ]);
    } else {
      sendMsg(ctx, text["error-msg"]);
    }
  } catch {
    sendMsg(ctx, text["error-server"]);
  }
});

function sendMsg(ctx, text, markup = []) {
  return ctx.replyWithHTML(text, setMarkup(markup));
}

function setMarkup(markup) {
  return Markup.keyboard(markup).oneTime().resize().extra();
}

function generateName() {
  let res = "";
  for (let i = 0; i < 6; i++) res += String(Math.floor(Math.random() * 9));
  return `Gamer ${res}`;
}

client.connect((err) => {
  if (err) console.log(err);
  global.users = client.db("correct-mistakes-bot").collection("users");
  bot.launch();
});
