import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function purgeExtras() {
  console.log("=== STARTING CONTROLLED PURGE OF TEST/EXTRA RECORDS ===");
  
  // 1. Delete enrolled_students/2126PMIM1141
  try {
    const enrRef = doc(db, "enrolled_students", "2126PMIM1141");
    const enrSnap = await getDoc(enrRef);
    if (enrSnap.exists()) {
      await deleteDoc(enrRef);
      console.log("Deleted enrolled_students/2126PMIM1141:", enrSnap.data()?.name || "Mac1");
    } else {
      console.log("enrolled_students/2126PMIM1141 already deleted.");
    }
  } catch (err) {
    console.error("Error deleting enrolled_students/2126PMIM1141:", err.message);
  }

  // 2. Delete cohort_progress extras
  const extras = ['2126PMIM1141', 'RPMR5AVKRRPCQVCWDKWBMHJWPXZ2', 'STD_2126PMIM1141'];
  for (const id of extras) {
    try {
      const cRef = doc(db, "cohort_progress", id);
      const cSnap = await getDoc(cRef);
      if (cSnap.exists()) {
        await deleteDoc(cRef);
        console.log(`Deleted cohort_progress/${id}`);
      } else {
        console.log(`cohort_progress/${id} not found.`);
      }
    } catch (err) {
      console.error(`Error deleting cohort_progress/${id}:`, err.message);
    }
  }

  console.log("=== PURGE COMPLETE ===");
}

purgeExtras().catch(console.error);
