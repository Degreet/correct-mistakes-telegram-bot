const Scene = require("telegraf/scenes/base");
const Extra = require("telegraf/extra");
const Markup = require("telegraf/markup");
const text = require("./text.json");

class SceneGen {
  GameScene() {
    const basicMarkup = [text["hint-btn"], text["exit-btn"]];
    const menuMarkup = [text["menu-btn"]];

    const game = new Scene("game");
    let quiz;

    game.enter((ctx) => {
      quiz = text.quiz[Math.floor(Math.random() * text.quiz.length)];
      sendMsg(ctx, quiz.text, basicMarkup);
    });

    game.on("message", async (ctx) => {
      const msg = ctx.message.text;
      if (msg == "Подсказка") {
        const userId = ctx.from.id;
        const candidate = await users.findOne({ userId });

        if ((candidate.hints || 0) < 1) {
          sendMsg(ctx, `У вас нет подсказок!`, basicMarkup);
        } else {
          const hint =
            quiz.hints[Math.floor(Math.random() * quiz.hints.length)];
          users.updateOne(
            { userId },
            {
              $set: {
                hints: candidate.hints - 1,
              },
            }
          );
          sendMsg(ctx, hint, basicMarkup);
        }
      } else if (msg == "Выйти из игры (-10 очков)") {
        const userId = ctx.from.id;
        const candidate = await users.findOne({ userId });
        const score = candidate.score || 0;
        users.updateOne(
          { userId },
          {
            $set: {
              score: score >= 10 ? score - 10 : 0,
            },
          }
        );
        sendMsg(ctx, "Вы вышли.", menuMarkup);
        ctx.scene.leave();
      } else {
        const userAnswer = ctx.message.text.replace("/answer ", "");
        const userId = ctx.from.id;
        const candidate = await users.findOne({ userId });
        let isSuccess = false;
        let plusScore;

        quiz.answers.forEach((answer) => {
          if (answer == userAnswer) {
            plusScore = Math.floor(Math.random() * 10 + 10);
            users.updateOne(
              { userId },
              {
                $set: {
                  wins: (candidate.wins || 0) + 1,
                  score: (candidate.score || 0) + plusScore,
                },
              }
            );

            isSuccess = true;
          }
        });

        if (isSuccess) {
          sendMsg(ctx, `Верно! +${plusScore} очков!`, menuMarkup);
          ctx.scene.leave();
        } else {
          sendMsg(ctx, `Неверный ответ!`, basicMarkup);
        }
      }
    });

    return game;
  }
}

function sendMsg(ctx, text, markup = []) {
  return ctx.replyWithHTML(text, setMarkup(markup));
}

function setMarkup(markup) {
  return Markup.keyboard(markup).oneTime().resize().extra();
}

module.exports = SceneGen;
