import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  authDomain: "logicq-clanguage.firebaseapp.com",
  projectId: "logicq-clanguage",
  storageBucket: "logicq-clanguage.firebasestorage.app",
  messagingSenderId: "898954156375",
  appId: "1:898954156375:web:838cb0fbbd27bb65f30612",
  measurementId: "G-EW7Z7K64FM",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function purge() {
  console.log("=== STARTING PURGE OF ALL STUDENTS EXCEPT DUMMY ===");

  // 1. Clean enrolled_students collection
  const enrolledSnap = await getDocs(collection(db, "enrolled_students"));
  console.log(`Found ${enrolledSnap.size} docs in enrolled_students.`);

  for (const d of enrolledSnap.docs) {
    const id = d.id;
    const data = d.data();
    const isDummy =
      id.toLowerCase() === "dummy" ||
      (data.prn && data.prn.toLowerCase() === "dummy") ||
      (data.email && data.email.toLowerCase() === "dummy@logicq.io");

    if (isDummy) {
      console.log(`Keeping dummy student doc: ${id}`);
    } else {
      console.log(`Deleting enrolled student doc: ${id} (${data.name || data.fullName}, ${data.prn}, ${data.email})...`);
      await deleteDoc(d.ref).catch((e) => console.warn(`Could not delete ${id}:`, e.message));
    }
  }

  // Ensure canonical 'dummy' exists with clean data
  console.log("Ensuring canonical enrolled_students/dummy exists...");
  await setDoc(doc(db, "enrolled_students", "dummy"), {
    prn: "DUMMY",
    name: "Dummy",
    fullName: "Dummy",
    displayName: "Dummy",
    email: "dummy@logicq.io",
    sectionId: "sec-mw6l4r2s",
    department: "Integrated M.Tech",
    year: "First Year (FY)",
    division: "A",
    status: "ENROLLED",
    joinedVia: "INSTANT_JOIN_LINK",
    enrolledAt: new Date().toISOString(),
  });

  // 2. Clean sections and section rosters
  const sectionsSnap = await getDocs(collection(db, "sections"));
  console.log(`Found ${sectionsSnap.size} sections.`);

  for (const secDoc of sectionsSnap.docs) {
    const secId = secDoc.id;
    const secData = secDoc.data();
    console.log(`Checking section: ${secId} (${secData.sectionName || secData.name || secData.subject})...`);

    // Clean students subcollection in this section
    try {
      const studentsSubSnap = await getDocs(collection(db, "sections", secId, "students"));
      for (const stDoc of studentsSubSnap.docs) {
        const isDummy = stDoc.id.toLowerCase() === "dummy" || (stDoc.data().prn && stDoc.data().prn.toLowerCase() === "dummy");
        if (secId === "sec-mw6l4r2s" && isDummy) {
          console.log(`  Keeping dummy in section ${secId}`);
        } else {
          console.log(`  Deleting student ${stDoc.id} from section ${secId}...`);
          await deleteDoc(stDoc.ref).catch((e) => console.warn(`Could not delete ${stDoc.id} from ${secId}:`, e.message));
        }
      }
    } catch (subErr) {
      console.warn(`Error cleaning students subcollection in ${secId}:`, subErr.message);
    }

    // Update studentsCount
    if (secId === "sec-mw6l4r2s" || secDoc.data().joinCode === "LQ-INTE34") {
      await setDoc(secDoc.ref, { studentsCount: 1, course: "Integrated M.Tech" }, { merge: true });
    } else {
      await setDoc(secDoc.ref, { studentsCount: 0 }, { merge: true });
    }
  }

  // Ensure dummy is in sec-mw6l4r2s students subcollection
  console.log("Ensuring dummy is in sections/sec-mw6l4r2s/students/dummy...");
  await setDoc(doc(db, "sections", "sec-mw6l4r2s", "students", "dummy"), {
    id: "dummy",
    prn: "DUMMY",
    name: "Dummy",
    fullName: "Dummy",
    displayName: "Dummy",
    email: "dummy@logicq.io",
    status: "ENROLLED",
    joinedVia: "INSTANT_JOIN_LINK",
    enrolledAt: new Date().toISOString(),
  });

  console.log("=== PURGE COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

purge().catch((err) => {
  console.error("Purge error:", err);
  process.exit(1);
});
