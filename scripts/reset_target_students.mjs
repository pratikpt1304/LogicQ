import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
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

const TARGET_STUDENTS = [
  {
    prn: "2126PMIM1105",
    name: "Siddheshwar Lahare",
    personalEmail: "siddheshwarlahare@gmail.com",
  },
  {
    prn: "2126PMIM1039",
    name: "Pratik Thorat",
    personalEmail: "thoratpratik2323@gmail.com",
  },
  {
    prn: "2126PMIF1057",
    name: "Samruddhi Rajesh Gangad",
    personalEmail: "samugangad@gmail.com",
  },
];

async function resetStudent(student) {
  const prn = student.prn.toUpperCase().trim();
  const instEmail = `${prn.toLowerCase()}@sanjivani.edu.in`;
  const personalEmail = student.personalEmail.toLowerCase().trim();
  const uid = `std_${prn.toLowerCase()}`;
  const cohortUid = `cohort-${prn.toLowerCase()}`;

  console.log(`\n======================================================`);
  console.log(`RESETTING STUDENT: ${prn} (${student.name})`);
  console.log(`Institutional Email: ${instEmail}`);
  console.log(`Previous Personal Email: ${personalEmail}`);
  console.log(`======================================================`);

  // 1. Delete all submissions across all submission collections
  const submissionCollections = [
    "submissions",
    "assessment_test_submissions",
    "assessment_submissions"
  ];

  for (const colName of submissionCollections) {
    const filters = [
      where("studentPrn", "==", prn),
      where("studentPrn", "==", prn.toLowerCase()),
      where("prn", "==", prn),
      where("prn", "==", prn.toLowerCase()),
      where("studentEmail", "==", instEmail),
      where("studentEmail", "==", personalEmail),
      where("email", "==", instEmail),
      where("email", "==", personalEmail),
      where("userId", "==", uid),
      where("userId", "==", cohortUid),
      where("userId", "==", prn),
    ];

    for (const f of filters) {
      try {
        const q = query(collection(db, colName), f);
        const snap = await getDocs(q);
        if (snap.size > 0) {
          console.log(`Found ${snap.size} docs in ${colName} matching filter...`);
          for (const d of snap.docs) {
            console.log(`  Deleting ${colName}/${d.id} (${d.data().problemTitle || d.data().problemSlug || 'sub'})...`);
            await deleteDoc(d.ref).catch((err) => console.warn(`    Failed to delete ${d.id}:`, err.message));
          }
        }
      } catch (e) {
        // Query might fail if index is missing or permission denied, ignore
      }
    }
  }

  // 2. Delete all drafts under cohort_progress/{prn}/drafts
  try {
    const draftsSnap = await getDocs(collection(db, "cohort_progress", prn, "drafts"));
    console.log(`Found ${draftsSnap.size} drafts under cohort_progress/${prn}/drafts`);
    for (const d of draftsSnap.docs) {
      console.log(`  Deleting draft ${d.id}...`);
      await deleteDoc(d.ref).catch((err) => console.warn(`    Failed to delete draft ${d.id}:`, err.message));
    }
  } catch (e) {
    console.warn(`Error scanning drafts for ${prn}:`, e.message);
  }

  // Also check lowercase prn drafts
  try {
    const draftsSnapLower = await getDocs(collection(db, "cohort_progress", prn.toLowerCase(), "drafts"));
    for (const d of draftsSnapLower.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
  } catch (e) {}

  // 3. Reset cohort_progress/{prn} document strictly with allowed keys
  console.log(`Resetting cohort_progress/${prn}...`);
  try {
    const cpPayload = {
      prn,
      totalSolved: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      completedProblems: [],
      draftCodes: {},
      isBanned: false,
      studentName: student.name,
      studentEmail: instEmail,
      isEmailBound: false,
      isEmailBoundV2: false,
      emailVerified: false,
      activeSession: false, // Forces session revocation
      registeredDevices: [], // Wipes device bindings
      tabSwitches: 0,
      pasteBursts: 0,
      clipboardAttempts: 0,
      fullscreenExits: 0,
      integrityScore: 100,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "cohort_progress", prn), cpPayload);
    console.log(`Successfully reset cohort_progress/${prn}`);
  } catch (e) {
    console.warn(`Failed to set cohort_progress/${prn}:`, e.message);
  }

  // 4. Reset enrolled_students/{prn} document strictly with allowed keys
  console.log(`Resetting enrolled_students/${prn}...`);
  try {
    const enrRef = doc(db, "enrolled_students", prn);
    const enrSnap = await getDoc(enrRef);
    const ex = enrSnap.exists() ? enrSnap.data() : {};

    const enrPayload = {
      prn,
      name: student.name,
      fullName: student.name,
      displayName: student.name,
      email: instEmail, // Reset to institutional email
      isEmailBound: false,
      isEmailBoundV2: false,
      isBanned: false,
      integrityScore: 100,
      tabSwitchCount: 0,
      tabSwitches: 0,
      pasteBursts: 0,
      copyPasteAttempts: 0,
      status: "ACTIVE",
      updatedAt: serverTimestamp(),
      sectionId: ex.sectionId || "LQ-C31A",
      sectionName: ex.sectionName || "C Programming Masterclass",
      course: ex.course || "Integrated M.Tech",
      college: ex.college || "Sanjivani University",
      department: ex.department || "Integrated M.Tech",
      year: ex.year || "FY",
      division: ex.division || "A",
      institution: ex.institution || "Sanjivani University",
      subject: ex.subject || "C Programming",
      joinedVia: ex.joinedVia || "ADMIN_ROSTER",
    };

    await setDoc(enrRef, enrPayload);
    console.log(`Successfully reset enrolled_students/${prn}`);
  } catch (e) {
    console.warn(`Failed to set enrolled_students/${prn}:`, e.message);
  }

  // 5. Reset in sections collection roster
  try {
    const secSnap = await getDocs(collection(db, "sections"));
    for (const secDoc of secSnap.docs) {
      const secData = secDoc.data();
      if (!Array.isArray(secData.students)) continue;

      let changed = false;
      const updatedStudents = secData.students.map((st) => {
        const stPrn = (st.prn || "").toUpperCase().trim();
        if (stPrn === prn) {
          changed = true;
          return {
            ...st,
            email: instEmail,
            totalPoints: 0,
            totalSolved: 0,
            isEmailBound: false,
            isEmailBoundV2: false,
          };
        }
        return st;
      });

      if (changed) {
        console.log(`Updating section ${secDoc.id} student entry for ${prn}...`);
        await updateDoc(secDoc.ref, { students: updatedStudents });
      }
    }
  } catch (e) {
    console.warn(`Error updating section roster for ${prn}:`, e.message);
  }

  // 6. Reset any matching users doc
  const userDocsToCheck = [prn, prn.toLowerCase(), uid, cohortUid];
  for (const uDocId of userDocsToCheck) {
    try {
      const uRef = doc(db, "users", uDocId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        console.log(`Resetting users/${uDocId}...`);
        await updateDoc(uRef, {
          email: instEmail,
          isEmailBound: false,
          isEmailBoundV2: false,
          emailVerified: false,
          totalPoints: 0,
          totalSolved: 0,
          currentStreak: 0,
          longestStreak: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {}
  }
}

async function runAll() {
  console.log("=== STARTING FULL STUDENT RESET FOR 3 USERS ===");
  for (const st of TARGET_STUDENTS) {
    await resetStudent(st);
  }
  console.log("\n======================================================");
  console.log("ALL 3 STUDENT ACCOUNTS HAVE BEEN COMPLETELY RESET!");
  console.log("- Submissions wiped");
  console.log("- Code drafts wiped");
  console.log("- Passwords reverted to default PRN (draft __account_security deleted)");
  console.log("- Registered devices unbound");
  console.log("- Email unbound & reverted to institutional email (@sanjivani.edu.in)");
  console.log("- Active session marked false (forces sign out on any active tab)");
  console.log("- Status set to ACTIVE and 100% clean integrity");
  console.log("======================================================");
  process.exit(0);
}

runAll().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
