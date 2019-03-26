const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
// const userBetRef = admin.firestore().collection("userbet");
// const usersRef = admin.firestore().collection("users");
var comission = 0;
exports.updateMatchAndAdmin = functions.firestore
  .document("ipl2019/{matchId}")
  .onUpdate((change, context) => {
    // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}

    const newValue = change.after.data();
    // ...or the previous value before this update
    // const previousValue = change.before.data();

    // access a particular field as you would any JS property
    const winner = newValue.winner;
    const matchActive = newValue.active;
    // console.log(`New Value: ${JSON.stringify(newValue)}`);
    // console.log(`Match ID: ${context.params.matchId}`);

    if (winner !== null && matchActive === true) {
      // const a_bet = newValue.a_bet;
      // const b_bet = newValue.b_bet;
      const rate1 = newValue.rate1;
      const rate2 = newValue.rate2;
      const rate3 = newValue.rate3;
      const options = newValue.options;
      // const currentMatch = newValue.teams;
      var docData = new Array();
      const promises = [];
      const promise1 = admin
        .firestore()
        .collection("userbet")
        .get()
        .then(snapshot =>
          snapshot.forEach(doc => {
            if (doc.data()["match"] === context.params.matchId) {
              docData.push(doc);
            }
          })
        )
        .catch(error => {
          console.log(`Error on getting user bet: ${error}`);
        });

      promises.push(promise1);

      const promise2 = promise1
        .then(() =>
          docData.forEach(doc => {
            // console.log(`DocData: ${JSON.stringify(doc.data())}`);
            const uid = doc.data()["uid"];
            const prediction = doc.data()["prediction"];
            const bet = doc.data()["bet"];
            const lastbalance = doc.data()["lastbalance"];
            if (winner === 0) {
              if (prediction === options[0]) {
                const betRateAmount = bet * rate1;
                comission = (bet * rate1 * 10) / 100;
                const winAmount = (betRateAmount - comission).toFixed(2);
                // console.log(`WinAmount: ${winAmount}`);
                updateUserBalance(uid, lastbalance, winAmount, doc);
              }
            } else if (winner === 1) {
              if (prediction === options[1]) {
                const betRateAmount = bet * rate2;
                comission = (bet * rate2 * 10) / 100;
                const winAmount = (betRateAmount - comission).toFixed(2);
                // console.log(`WinAmount: ${winAmount}`);
                updateUserBalance(uid, lastbalance, winAmount, doc);
              }
            } else if (winner === 2) {
              const betRateAmount = bet * rate3;
              comission = (bet * rate3 * 10) / 100;
              const winAmount = (betRateAmount - comission).toFixed(2);
              // console.log(`WinAmount: ${winAmount}`);
              updateUserBalance(uid, lastbalance, winAmount, doc);
            }

            // return console.log("No Winner found. Setting Winner to null");
          })
        )
        .catch(error => {
          console.log(`Error on updating wallets: ${error}`);
        });

      promises.push(promise2);

      const promise3 = promise2
        .then(() => {
          return admin
            .firestore()
            .collection("users")
            .doc("s0BRzQUtuFhL0bXsHG4a1MUmd9g2")
            .get();
        })
        .catch(error => {
          console.log(`Error on getting admin data: ${error}`);
        });
      promises.push(promise3);

      const promise4 = promise3
        .then(snapshot => {
          const existingBal = snapshot.data()["balance"];
          admin
            .firestore()
            .collection("users")
            .doc("s0BRzQUtuFhL0bXsHG4a1MUmd9g2")
            .update({
              balance: existingBal + comission
            });

          //* Update the final active match or not
          return change.after.ref.set(
            {
              active: false
            },
            { merge: true }
          );
        })
        .catch(error => {
          console.log(`Error on updating admin commission: ${error}`);
        });
      promises.push(promise4);
      return Promise.all(promises);
    }
    // return console.log("No winner case");
    // perform desired operations ...
  });

function updateUserBalance(uid, lastbalance, winAmount, doc) {
  const floatWinAmount = parseFloat(winAmount);
  const finalBal = parseFloat((lastbalance + floatWinAmount).toFixed(2));
  admin
    .firestore()
    .collection("userbet")
    .doc(doc.id)
    .update({
      won: floatWinAmount,
      active: false
    });
  admin
    .firestore()
    .collection("users")
    .doc(uid)
    .update({
      balance: finalBal
    });

  // return console.log(`Updated user ${uid} Bet & Balance to: ${finalBal}`);
}
// exports.getConfigData = functions.https.onRequest((request, response) => {
//   admin
//     .firestore()
//     .collection("appconfig")
//     .get()
//     .then(snapshot => {
//       const data = snapshot.docs[0].data();
//       return response.send(data);
//     })
//     .catch(error => {
//       console.log(error);
//     });
// });
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
