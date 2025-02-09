const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const askToUpdateTrade = require('./ask_to_update_trade');
const {callbackCommands} = require('./../interface');
const cancelInvoice = require('./cancel_invoice');
const cancelTrade = require('./cancel_trade');
const {checkAccess} = require('./../authentication');
const moveInvoiceNode = require('./move_invoice_node');
const moveTradeNode = require('./move_trade_node');
const removeMessage = require('./remove_message');
const setInvoiceDescription = require('./set_invoice_description');
const setInvoiceNode = require('./set_invoice_node');
const setInvoiceTokens = require('./set_invoice_tokens');
const setTradeNode = require('./set_trade_node');
const terminateBot = require('./terminate_bot');
const warnUnknownButton = require('./warn_unknown_button');

const {exit} = process;
const {isArray} = Array;

/** Respond to a button push on a message

  {
    bot: <Telegram Bot Object>
    ctx: <Telegram Context Object>
    id: <Connected Telegram User Id Number>
    nodes: [{
      from: <Saved Node Name String>
      lnd: <Authenticated LND API Object>
      public_key: <Public Key Hex String>
    }]
  }

  @returns via cbk or Promise
*/
module.exports = ({bot, ctx, id, nodes}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!bot) {
          return cbk([400, 'ExpectedTelegramBotToHandleButtonPushEvent']);
        }

        if (!ctx) {
          return cbk([400, 'ExpectedTelegramContextToHandleButtonPushEvent']);
        }

        if (!id) {
          return cbk([400, 'ExpectedConnectedUserIdToHandleButtonPushEvent']);
        }

        if (!isArray(nodes)) {
          return cbk([400, 'ExpectedArrayOfNodesToHandleButtonPushEvent']);
        }

        return cbk();
      },

      // Confirm access authorization
      checkAccess: ['validate', ({}, cbk) => {
        return checkAccess({
          id,
          from: ctx.update.callback_query.from.id,
          reply: ctx.reply,
        },
        cbk);
      }],

      // Find button command type
      type: ['checkAccess', ({}, cbk) => {
        const {data} = ctx.update.callback_query;

        // Moving invoice has the button name as a prefix
        if (data.startsWith(callbackCommands.moveInvoiceNode)) {
          return cbk(null, callbackCommands.moveInvoiceNode);
        }

        // Moving a trade has the button name as a prefix
        if (data.startsWith(callbackCommands.moveTradeNode)) {
          return cbk(null, callbackCommands.moveTradeNode);
        }

        return cbk(null, data);
      }],

      // Perform button action based on type
      action: ['type', ({type}, cbk) => {
        switch (type) {
        // Pressed to remove a created invoice
        case callbackCommands.cancelInvoice:
          return cancelInvoice({ctx}, cbk);

        // Pressed to remove a created trade
        case callbackCommands.cancelTrade:
          return cancelTrade({ctx, nodes}, cbk);

        // Pressed to move an invoice to a specific saved node
        case callbackCommands.moveInvoiceNode:
          return moveInvoiceNode({ctx, nodes}, cbk);

        // Pressed to move a trade to a specific saved node
        case callbackCommands.moveTradeNode:
          return moveTradeNode({ctx, nodes}, cbk);

        // Pressed to remove a generic message
        case callbackCommands.removeMessage:
          return removeMessage({ctx}, cbk);

        // Pressed to set a created invoice description
        case callbackCommands.setInvoiceDescription:
          return setInvoiceDescription({ctx, nodes}, cbk);

        // Pressed to set the node of an invoice
        case callbackCommands.setInvoiceNode:
          return setInvoiceNode({ctx, nodes}, cbk);

        // Pressed to set the invoiced amount
        case callbackCommands.setInvoiceTokens:
          return setInvoiceTokens({ctx, nodes}, cbk);

        // Pressed to update a created trade
        case callbackCommands.setTradeDescription:
        case callbackCommands.setTradeExpiresAt:
          return askToUpdateTrade({ctx, nodes, command: type}, cbk);

        // Pressed to move a trade to a specific saved node
        case callbackCommands.setTradeNode:
          return setTradeNode({ctx, nodes}, cbk);

        // Pressed to terminate the bot
        case callbackCommands.terminateBot:
          return terminateBot({bot, ctx, exit}, cbk);

        // Pressed something unknown
        default:
          return warnUnknownButton({ctx}, cbk);
        }
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
