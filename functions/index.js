const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
// const userBetRef = admin.firestore().collection("userbet");
// const usersRef = admin.firestore().collection("users");

exports.updatedUserBet = functions.firestore
  .document("userbet/{userID}")
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const adjustment = newValue.adjustment;
    const won = newValue.won;
    const commission = newValue.commission;

    if (won !== 0 && adjustment === true) {
      const promises = [];
      const adminBalance = admin
        .firestore()
        .doc("users/s0BRzQUtuFhL0bXsHG4a1MUmd9g2")
        .get();
      promises.push(adminBalance);

      const updateAdmin = adminBalance
        .then(snapshot => {
          if (snapshot.exists) {
            console.log(JSON.stringify(snapshot.data()));
          }
          return updateAdminBal(snapshot.data().balance, commission);
        })
        .catch(e => {
          return console.log(`Error on getting & setting admin data: ${e}`);
        });

      promises.push(updateAdmin);

      return Promise.all(promises);
    }
    return console.log("Admin Wallet Updated");
  });

exports.createdMatch = functions.firestore
  .document("ipl2019/{matchId}")
  .onCreate(async (snapshot, context) => {
    const teams = snapshot.data().teams;

    var message = {
      notification: {
        title: "New Game Added",
        body: `Play Open for ${teams}`
      },
      topic: "GameOn"
    };

    admin
      .messaging()
      .send(message)
      .then(response => {
        return console.log("Successfully sent message:", response);
      })
      .catch(error => {
        return console.log("Error sending message:", error);
      });
  });

exports.updatedMatch = functions.firestore
  .document("ipl2019/{matchId}")
  .onUpdate(async (change, context) => {
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

      var userBetSnapshot;
      try {
        userBetSnapshot = await admin
          .firestore()
          .collection("userbet")
          .get();
      } catch (e) {
        console.log(`Error on getting user bet: ${e}`);
      }

      // for(var doc in userBetSnapshot){
      //   await
      // }

      userBetSnapshot.forEach(doc => {
        if (doc.data()["match"] === context.params.matchId) {
          docData.push(doc);
        }
      });

      const promisesToAwait = [];
      for (const doc of docData) {
        promisesToAwait.push(
          docOperation(doc, winner, options, rate1, rate2, rate3)
        );
      }

      var responses = await Promise.all(promisesToAwait);
      console.log(`End of admin phase: ${responses}`);
      // console.log("Done");
      change.after.ref.set(
        {
          active: false
        },
        {
          merge: true
        }
      );

      // start();

      // docData
      //   .forEach(async doc => {
      //     // console.log(`DocData: ${JSON.stringify(doc.data())}`);
      //     var commission = 0;
      //     const uid = doc.data()["uid"];
      //     const prediction = doc.data()["prediction"];
      //     const bet = doc.data()["bet"];
      //     const lastbalance = doc.data()["lastbalance"];
      //     if (winner === 0) {
      //       if (prediction === options[0]) {
      //         const betRateAmount = bet * rate1;
      //         commission = (bet * rate1 * 10) / 100;
      //         const winAmount = (betRateAmount - commission).toFixed(2);
      //         // console.log(`WinAmount: ${winAmount}`);
      //         return await updateUserBalance(uid, lastbalance, winAmount, doc);
      //       }
      //     } else if (winner === 1) {
      //       if (prediction === options[1]) {
      //         const betRateAmount = bet * rate2;
      //         commission = (bet * rate2 * 10) / 100;
      //         const winAmount = (betRateAmount - commission).toFixed(2);
      //         // console.log(`WinAmount: ${winAmount}`);
      //         return await updateUserBalance(uid, lastbalance, winAmount, doc);
      //       }
      //     } else if (winner === 2) {
      //       if (prediction === options[2]) {
      //         const betRateAmount = bet * rate3;
      //         commission = (bet * rate3 * 10) / 100;
      //         const winAmount = (betRateAmount - commission).toFixed(2);
      //         // console.log(`WinAmount: ${winAmount}`);
      //         return await updateUserBalance(uid, lastbalance, winAmount, doc);
      //       }
      //     }
      //     var existingBal = await getAdminBal();
      //     return await updateAdminBal(existingBal, commission);

      //     // return console.log("No Winner found. Setting Winner to null");
      //   })
      //   .then(() => {
      //     return change.after.ref.set(
      //       {
      //         active: false
      //       },
      //       {
      //         merge: true
      //       }
      //     );
      //   })
      // .catch(e => {
      //   return console.log(`Exception on for each: ${e}`);
      // });

      // perform desired operations ...
    }
    return console.log("No winner case");
  });

async function docOperation(doc, winner, options, rate1, rate2, rate3) {
  console.log(`doc loop: ${JSON.stringify(doc.data())}`);
  var commission = 0;
  const uid = doc.data()["uid"];
  const prediction = doc.data()["prediction"];
  const bet = doc.data()["bet"];
  const lastbalance = doc.data()["lastbalance"];
  const fcmToken = doc.data()["fcmToken"];
  if (winner === 0) {
    if (prediction === options[0]) {
      const betRateAmount = bet * rate1;
      commission = (bet * rate1 * 10) / 100;
      const winAmount = (betRateAmount - commission).toFixed(2);
      // console.log(`WinAmount: ${winAmount}`);
      updateUserBalance(
        uid,
        lastbalance,
        betRateAmount,
        commission,
        winAmount,
        doc,
        fcmToken
      );
    }
  } else if (winner === 1) {
    if (prediction === options[1]) {
      const betRateAmount = bet * rate2;
      commission = (bet * rate2 * 10) / 100;
      const winAmount = (betRateAmount - commission).toFixed(2);
      // console.log(`WinAmount: ${winAmount}`);
      updateUserBalance(
        uid,
        lastbalance,
        betRateAmount,
        commission,
        winAmount,
        doc,
        fcmToken
      );
    }
  } else if (winner === 2) {
    if (prediction === options[2]) {
      const betRateAmount = bet * rate3;
      commission = (bet * rate3 * 10) / 100;
      const winAmount = (betRateAmount - commission).toFixed(2);
      // console.log(`WinAmount: ${winAmount}`);
      updateUserBalance(
        uid,
        lastbalance,
        betRateAmount,
        commission,
        winAmount,
        doc,
        fcmToken
      );
    }
  }
}

// function getAdminBal() {
//   admin
//     .firestore()
//     .doc("users/s0BRzQUtuFhL0bXsHG4a1MUmd9g2")
//     .get()
//     .then(snaphot => {
//       if (snaphot.exists) {
//         console.log(JSON.stringify(snaphot.data()));
//       }
//       return updateAdminBal(balance, commission);
//     })
//     .catch(e => {
//       return console.log(`Error on getting & setting admin data: ${e}`);
//     });
// }

function updateAdminBal(existingBal, commission) {
  var res = admin
    .firestore()
    .collection("users")
    .doc("s0BRzQUtuFhL0bXsHG4a1MUmd9g2")
    .update({
      balance: existingBal + commission
    });

  console.log(
    `Updated Admin Existing ${existingBal} Balance to: ${existingBal +
      commission}`
  );
  return res;
}

function updateUserBalance(
  uid,
  lastbalance,
  betRateAmount,
  commission,
  winAmount,
  doc,
  fcmToken
) {
  const floatWinAmount = parseFloat(winAmount);
  const finalBal = parseFloat((lastbalance + floatWinAmount).toFixed(2));
  admin
    .firestore()
    .collection("userbet")
    .doc(doc.id)
    .update({
      won: floatWinAmount,
      adjustment: true,
      betrate: betRateAmount,
      commission: commission
    });
  admin
    .firestore()
    .collection("users")
    .doc(uid)
    .update({
      balance: finalBal
    });

  var payload = {
    notification: {
      title: `Congratulations, You Won ${floatWinAmount}!`,
      body: `Your balance is updated to ${finalBal} Keep playing!.`
    }
  };

  var options = {
    priority: "high"
  };

  admin
    .messaging()
    .sendToDevice(fcmToken, payload, options)
    .then(response => {
      return console.log("Successfully sent message:", response);
    })
    .catch(error => {
      return console.log("Error sending message:", error);
    });

  console.log(`Updated user ${uid} Bet & Balance to: ${finalBal}`);
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
