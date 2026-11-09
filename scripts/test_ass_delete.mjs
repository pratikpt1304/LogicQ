import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  deleteDoc
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

async function testAssDelete() {
  const subId = "9GRb1QEx9SyfVFIH7ULA";
  console.log(`Testing delete of assessment submission ${subId}...`);
  try {
    await deleteDoc(doc(db, "assessment_test_submissions", subId));
    console.log(`Successfully deleted ${subId}`);
  } catch (e) {
    console.log(`Failed to delete: ${e.message}`);
  }
}

testAssDelete().catch(console.error);
