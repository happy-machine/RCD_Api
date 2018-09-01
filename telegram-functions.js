/*jshint esversion: 6 */

module.exports = {
    sendToBot: (message, token = "645121157:AAFVvaehPv3fkN4mALIysCq27b5Q3gtyIPY", chatId = '-1001389216905') => {
        axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
          chat_id: chatId,
          status: 200,
          text: message
        })
        .catch(err => {
          console.log('Error :', err)
          res.end('Error :' + err)
        });
      }
};