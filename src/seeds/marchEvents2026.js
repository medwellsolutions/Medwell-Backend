require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("../models/EventSchema");

const MONTH = "2026-03";

const events = [
  // ─────────────────────────────────────────────
  // 1. National Nutrition Month
  // ─────────────────────────────────────────────
  {
    name: "National Nutrition Month",
    caption: "Fuel your body right — one meal at a time.",
    month: MONTH,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-31"),
    shortDescription:
      "National Nutrition Month® is an annual campaign by the Academy of Nutrition and Dietetics. This March, we challenge you to make informed food choices, build healthy eating habits, and spread nutrition awareness in your community.",
    longDescription:
      "Every March, the Academy of Nutrition and Dietetics invites everyone to learn about making informed food choices and developing sound eating and physical activity habits. This year's theme focuses on personalizing your plate — recognizing that no single diet works for everyone. Through this event, you'll learn to read nutrition labels, plan balanced meals, reduce processed food intake, and share what you learn with friends and family. Small, consistent changes in your diet can significantly reduce your risk of chronic diseases like diabetes, heart disease, and obesity.",
    actionSteps: [
      {
        stepNumber: 1,
        title: "Learn the Basics",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Why Nutrition Matters",
            text: "Good nutrition is the foundation of good health. A balanced diet gives your body the nutrients it needs to function correctly, helps maintain a healthy weight, and reduces the risk of chronic illnesses.",
          },
          {
            heading: "What to Do",
            text: "Read about MyPlate guidelines from the USDA — a practical framework for building balanced meals. Learn to read nutrition labels on packaged foods and identify hidden sugars, sodium, and unhealthy fats.",
            links: [
              { label: "MyPlate — USDA", url: "https://www.myplate.gov" },
              { label: "Academy of Nutrition and Dietetics", url: "https://www.eatright.org" },
            ],
          },
        ],
      },
      {
        stepNumber: 2,
        title: "Plan a Balanced Week",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Your 7-Day Challenge",
            text: "Plan a full week of meals that include all five food groups: fruits, vegetables, grains, protein foods, and dairy (or fortified alternatives). Aim to cook at least 4 meals at home this week using fresh ingredients.",
          },
          {
            heading: "Tips",
            text: "Use seasonal produce to save money. Prep ingredients in bulk on Sunday. Replace one processed snack each day with a fruit, nut, or vegetable option.",
          },
        ],
      },
      {
        stepNumber: 3,
        title: "Share & Submit Proof",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Spread the Word",
            text: "Share a photo of a balanced meal you prepared, or post a nutrition tip on social media with the hashtag #MedwellNutrition. Tag a friend to take the challenge with you.",
          },
          {
            heading: "How to Submit",
            text: "Upload a photo of your balanced meal or share your social media post link below. Write a few lines about what you changed in your diet and what you learned.",
          },
        ],
      },
    ],
    estimatedTime: { text: "3–5 hours over the month", minHours: 3, maxHours: 5 },
    volunteerHours: { isAvailable: true, hours: 3 },
    requirements: [
      { title: "Commitment", description: "Commit to trying at least one new healthy recipe during March." },
      { title: "Sharing", description: "Share your experience with at least one other person — a friend, family member, or follower." },
    ],
    checkListItems: [
      { text: "Read about MyPlate guidelines", isMandatory: true },
      { text: "Plan a week of balanced meals", isMandatory: true },
      { text: "Cook at least 4 meals at home this week", isMandatory: false },
      { text: "Share a meal photo or nutrition tip online", isMandatory: true },
    ],
    FAQs: [
      { question: "Do I need to follow a specific diet?", answer: "No — the goal is balance and awareness, not a strict diet plan. Focus on adding more whole foods rather than restricting." },
      { question: "Can I participate if I have dietary restrictions?", answer: "Absolutely. Adapt the guidelines to your needs — vegetarian, vegan, gluten-free all count." },
    ],
    additionalInstructions: [
      { title: "Consult a Professional", description: "If you have a health condition, consult a registered dietitian before making significant dietary changes." },
    ],
    certificateInfo: { includesName: true, includesDate: true, includesEventName: true, includesHours: true },
    isActive: true,
  },

  // ─────────────────────────────────────────────
  // 2. Endometriosis Awareness Month
  // ─────────────────────────────────────────────
  {
    name: "Endometriosis Awareness Month",
    caption: "1 in 10 women. It's time to talk about it.",
    month: MONTH,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-31"),
    shortDescription:
      "Endometriosis affects over 190 million people worldwide, yet remains largely misunderstood and underdiagnosed. This March, join us in raising awareness, supporting those affected, and demanding better research and care.",
    longDescription:
      "Endometriosis is a chronic condition where tissue similar to the uterine lining grows outside the uterus, causing severe pain, inflammation, and in many cases infertility. Despite affecting 1 in 10 women of reproductive age, it takes an average of 7–10 years to receive a diagnosis. March is Endometriosis Awareness Month — a global campaign to change that. Through education, open conversations, and community advocacy, we can reduce stigma, improve early detection, and support those living with this condition every day.",
    actionSteps: [
      {
        stepNumber: 1,
        title: "Educate Yourself",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Understanding Endometriosis",
            text: "Learn what endometriosis is, its symptoms (chronic pelvic pain, painful periods, pain during intercourse, fatigue), and why it's often dismissed or misdiagnosed as 'just bad periods'.",
            links: [
              { label: "Endometriosis Foundation of America", url: "https://www.endofound.org" },
              { label: "World Endometriosis Society", url: "https://endometriosis.ca" },
            ],
          },
          {
            heading: "Diagnostic Delays",
            text: "Understand why diagnosis takes so long — societal normalization of menstrual pain, lack of physician training, and the fact that definitive diagnosis requires laparoscopic surgery.",
          },
        ],
      },
      {
        stepNumber: 2,
        title: "Raise Awareness",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Wear Yellow",
            text: "Yellow is the color of endometriosis awareness. Wear yellow on March 1 (World Endometriosis Day) and throughout the month to spark conversations.",
          },
          {
            heading: "Share Information",
            text: "Post an endometriosis fact on your social media. Use hashtags #EndoAwareness #1in10 #MedwellEndo. You could be the reason someone finally gets the help they need.",
          },
        ],
      },
      {
        stepNumber: 3,
        title: "Support & Submit",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Support Someone",
            text: "If you know someone with endometriosis, reach out. Sometimes simply saying 'I believe you' means the world. Consider donating to an endometriosis research fund.",
          },
          {
            heading: "Submit Your Proof",
            text: "Share a screenshot of your awareness post, a photo of you wearing yellow, or a note about a conversation you had. Write about what you learned or how this issue has affected you or someone you know.",
          },
        ],
      },
    ],
    estimatedTime: { text: "2–4 hours", minHours: 2, maxHours: 4 },
    volunteerHours: { isAvailable: true, hours: 2 },
    requirements: [
      { title: "Openness", description: "Approach this topic with empathy. Endometriosis is often invisible — people may not look sick but suffer daily." },
    ],
    checkListItems: [
      { text: "Read about endometriosis symptoms and diagnosis", isMandatory: true },
      { text: "Share an awareness post on social media", isMandatory: true },
      { text: "Have a conversation about endo with someone", isMandatory: false },
      { text: "Wear yellow on World Endometriosis Day (March 1)", isMandatory: false },
    ],
    FAQs: [
      { question: "Can men participate?", answer: "Yes — endometriosis affects people with a uterus, but awareness is everyone's responsibility. Partners, family, and friends can advocate and support." },
      { question: "Is there a cure?", answer: "There is currently no cure, but treatments exist to manage symptoms. Early diagnosis significantly improves quality of life." },
    ],
    additionalInstructions: [
      { title: "Be Sensitive", description: "Some participants may be personally affected. Create a safe space for sharing and avoid dismissive language." },
    ],
    certificateInfo: { includesName: true, includesDate: true, includesEventName: true, includesHours: true },
    isActive: true,
  },

  // ─────────────────────────────────────────────
  // 3. National Kidney Month
  // ─────────────────────────────────────────────
  {
    name: "National Kidney Month",
    caption: "Protect your kidneys — they filter more than you think.",
    month: MONTH,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-31"),
    shortDescription:
      "Over 37 million Americans live with chronic kidney disease, and most don't know it. This March, learn the risk factors, get tested if necessary, and take steps to protect your kidney health.",
    longDescription:
      "Your kidneys filter about 200 liters of blood every day, removing waste, excess fluids, and toxins. Chronic kidney disease (CKD) affects 1 in 7 adults — and 9 out of 10 don't know they have it. March is National Kidney Month, an annual awareness campaign led by the National Kidney Foundation. Through this event, you'll learn how to protect your kidneys, understand the connection between kidney disease, diabetes, and high blood pressure, and take concrete steps toward kidney health for yourself and those around you.",
    actionSteps: [
      {
        stepNumber: 1,
        title: "Know Your Kidneys",
        isRequired: true,
        contentBlocks: [
          {
            heading: "What Your Kidneys Do",
            text: "Beyond filtering blood, kidneys regulate blood pressure, produce red blood cells, and keep bones healthy. Damage is often silent — symptoms don't appear until 90% of function is lost.",
          },
          {
            heading: "Risk Factors",
            text: "Diabetes and high blood pressure account for 2 of 3 new kidney disease cases. Other risks include family history, age over 60, obesity, and frequent use of NSAIDs (ibuprofen, naproxen).",
            links: [
              { label: "National Kidney Foundation", url: "https://www.kidney.org" },
              { label: "NIDDK — Kidney Disease Info", url: "https://www.niddk.nih.gov/health-information/kidney-disease" },
            ],
          },
        ],
      },
      {
        stepNumber: 2,
        title: "Take Action for Kidney Health",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Lifestyle Changes",
            text: "Stay well hydrated (6–8 glasses of water daily). Reduce sodium intake to under 2,300mg/day. Exercise at least 30 minutes most days. Avoid smoking and limit alcohol.",
          },
          {
            heading: "Get Tested",
            text: "If you have risk factors, talk to your doctor about a simple blood test (eGFR) and urine test (ACR) to check kidney function. Early detection is key.",
          },
        ],
      },
      {
        stepNumber: 3,
        title: "Spread Awareness & Submit",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Share the Message",
            text: "Post a kidney health fact on social media using #KidneyMonth #MedwellKidney. Encourage a family member or friend who may be at risk to get their kidneys checked.",
          },
          {
            heading: "Submit Proof",
            text: "Upload a screenshot of your awareness post or a photo of your daily hydration tracker. Share what you learned and one change you're making for your kidney health.",
          },
        ],
      },
    ],
    estimatedTime: { text: "2–3 hours", minHours: 2, maxHours: 3 },
    volunteerHours: { isAvailable: true, hours: 2 },
    requirements: [
      { title: "Hydration Commitment", description: "Track your water intake for at least 3 days this month." },
    ],
    checkListItems: [
      { text: "Read about CKD risk factors and prevention", isMandatory: true },
      { text: "Track daily water intake for 3 days", isMandatory: false },
      { text: "Reduce sodium intake for one week", isMandatory: false },
      { text: "Share a kidney health fact on social media", isMandatory: true },
    ],
    FAQs: [
      { question: "How do I know if my kidneys are healthy?", answer: "The only way to know is through blood and urine tests. Most early-stage CKD has no symptoms — don't wait for symptoms to get tested if you have risk factors." },
      { question: "Can kidney disease be reversed?", answer: "Early-stage CKD can sometimes be slowed or halted with lifestyle changes and treatment. Advanced kidney disease is not reversible, but progression can be managed." },
    ],
    additionalInstructions: [
      { title: "Medical Advice", description: "This event is for awareness only. If you have symptoms or risk factors, consult a nephrologist or your primary care physician." },
    ],
    certificateInfo: { includesName: true, includesDate: true, includesEventName: true, includesHours: true },
    isActive: true,
  },

  // ─────────────────────────────────────────────
  // 4. Colorectal Cancer Awareness Month
  // ─────────────────────────────────────────────
  {
    name: "Colorectal Cancer Awareness Month",
    caption: "Early detection saves lives — get screened.",
    month: MONTH,
    startsAt: new Date("2026-03-01"),
    endsAt: new Date("2026-03-31"),
    shortDescription:
      "Colorectal cancer is the 2nd leading cause of cancer death in the US — yet it is one of the most preventable and treatable cancers when caught early. This March, learn the signs, encourage screening, and wear blue.",
    longDescription:
      "Colorectal cancer (cancer of the colon or rectum) affects over 150,000 people in the US each year. The good news: it is highly preventable through regular screening, and when caught early, the 5-year survival rate is over 90%. March is Colorectal Cancer Awareness Month — a time to cut through the silence and stigma around colon health, promote timely screenings, and support those affected by this disease. From diet and lifestyle changes to understanding screening options, this month's activities could literally save your life or someone you love.",
    actionSteps: [
      {
        stepNumber: 1,
        title: "Understand the Disease",
        isRequired: true,
        contentBlocks: [
          {
            heading: "What Is Colorectal Cancer?",
            text: "Colorectal cancer starts as small, benign clumps of cells called polyps that can develop into cancer over time. Most cases have no symptoms in early stages — which is why screening is critical.",
          },
          {
            heading: "Symptoms to Watch For",
            text: "Blood in stool, persistent change in bowel habits, abdominal pain, unexplained weight loss, or fatigue. These can appear in later stages — don't wait for symptoms to get screened.",
            links: [
              { label: "Colorectal Cancer Alliance", url: "https://www.ccalliance.org" },
              { label: "American Cancer Society — CRC", url: "https://www.cancer.org/cancer/types/colon-rectal-cancer.html" },
            ],
          },
        ],
      },
      {
        stepNumber: 2,
        title: "Know Your Screening Options",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Screening Saves Lives",
            text: "Current guidelines recommend colorectal cancer screening starting at age 45 for average-risk adults. Options include colonoscopy (every 10 years), stool-based tests (annually or every 3 years), and CT colonography.",
          },
          {
            heading: "Lifestyle Factors",
            text: "Reduce risk by eating a high-fiber diet rich in fruits, vegetables, and whole grains. Limit red and processed meats. Exercise regularly, maintain a healthy weight, avoid smoking, and limit alcohol.",
          },
        ],
      },
      {
        stepNumber: 3,
        title: "Wear Blue & Submit",
        isRequired: true,
        contentBlocks: [
          {
            heading: "Wear Blue for Colon Cancer",
            text: "Blue is the color of colorectal cancer awareness. Wear blue this March and post a photo using #WearBlue #MedwellCRC. Encourage someone over 45 in your life to schedule a screening.",
          },
          {
            heading: "Submit Your Action",
            text: "Upload a photo of you wearing blue, a screenshot of an awareness post, or a note about encouraging someone to get screened. Share what you learned and any action you took.",
          },
        ],
      },
    ],
    estimatedTime: { text: "2–4 hours", minHours: 2, maxHours: 4 },
    volunteerHours: { isAvailable: true, hours: 2 },
    requirements: [
      { title: "Awareness First", description: "Read at least one credible source on colorectal cancer screening guidelines before completing the steps." },
    ],
    checkListItems: [
      { text: "Read about colorectal cancer symptoms and screening", isMandatory: true },
      { text: "Wear blue and post on social media", isMandatory: true },
      { text: "Encourage someone to schedule a screening", isMandatory: false },
      { text: "Review your own diet for colorectal risk factors", isMandatory: false },
    ],
    FAQs: [
      { question: "At what age should I get screened?", answer: "Current guidelines recommend starting at age 45 for average-risk individuals. If you have a family history of CRC, talk to your doctor about starting earlier." },
      { question: "Is a colonoscopy the only option?", answer: "No. There are several non-invasive stool-based tests (like Cologuard or FIT) that can be done at home. Talk to your doctor about the best option for you." },
    ],
    additionalInstructions: [
      { title: "Be Sensitive", description: "Some participants may have personal experience with colorectal cancer. Approach conversations with empathy and respect." },
      { title: "Screening Access", description: "Many community health centers offer free or low-cost screenings. Share these resources with those who may not have easy access to care." },
    ],
    certificateInfo: { includesName: true, includesDate: true, includesEventName: true, includesHours: true },
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.DB);
    console.log("Connected to MongoDB");

    for (const eventData of events) {
      const existing = await Event.findOne({ name: eventData.name, month: eventData.month });
      if (existing) {
        console.log(`⚠  Skipped (already exists): ${eventData.name}`);
        continue;
      }
      const created = await Event.create(eventData);
      console.log(`✅ Created: ${created.name} (${created._id})`);
    }

    console.log("\nAll done.");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
