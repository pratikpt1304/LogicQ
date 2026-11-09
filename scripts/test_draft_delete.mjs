import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  deleteDoc,
  setDoc,
  collection,
  getDocs
} from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDraftDelete() {
  const prn = "2126PMIM1039";
  const drafts = await getDocs(collection(db, "cohort_progress", prn, "drafts"));
  console.log(`Found ${drafts.size} drafts for ${prn}`);
  for (const d of drafts.docs) {
    console.log(`Testing delete of draft ${d.id}...`);
    try {
      await deleteDoc(d.ref);
      console.log(`Successfully deleted draft ${d.id}`);
    } catch (e) {
      console.log(`Delete draft failed: ${e.message}`);
    }
  }
}

testDraftDelete().catch(console.error);
