import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const categories = [
  { id: 'childhood', sortOrder: 1, questions: { en: ['What is your earliest childhood memory?', 'What games did you love playing as a child?'], hi: ['बचपन की आपकी सबसे पहली याद क्या है?', 'बचपन में आपको कौन से खेल खेलना सबसे अच्छा लगता था?'], gu: ['તમારી બાળપણની સૌથી પહેલી યાદ કઈ છે?', 'બાળપણમાં તમને કઈ રમતો રમવી ગમતી હતી?'] } },
  { id: 'love', sortOrder: 2, questions: { en: ['How did you meet the person you love?', 'When did you first feel that you had found your home in someone?'], hi: ['आप अपने जीवनसाथी से पहली बार कैसे मिले?', 'आपको पहली बार कब लगा कि आपको अपना हमसफ़र मिल गया है?'], gu: ['તમે તમારા જીવનસાથીને પહેલી વાર કેવી રીતે મળ્યા?', 'તમને પહેલી વાર ક્યારે લાગ્યું કે તમને તમારો જીવનસાથી મળી ગયો છે?'] } },
  { id: 'family', sortOrder: 3, questions: { en: ['What family tradition means the most to you?', 'What is one moment with your family you wish you could relive?'], hi: ['परिवार की कौन सी परंपरा आपके लिए सबसे खास है?', 'परिवार के साथ बिताया कौन सा पल आप फिर से जीना चाहेंगे?'], gu: ['પરિવારની કઈ પરંપરા તમારા માટે સૌથી ખાસ છે?', 'પરિવાર સાથેની કઈ ક્ષણ તમે ફરીથી જીવવા માંગશો?'] } },
  { id: 'life-lessons', sortOrder: 4, questions: { en: ['What is the most important lesson life has taught you?', 'What advice would you give your younger self?'], hi: ['ज़िंदगी ने आपको सबसे बड़ा सबक क्या सिखाया है?', 'आप अपने छोटे रूप को क्या सलाह देना चाहेंगे?'], gu: ['જીવને તમને સૌથી મોટો પાઠ કયો શીખવ્યો છે?', 'તમે તમારા નાના સ્વરૂપને શું સલાહ આપશો?'] } },
  { id: 'little-things', sortOrder: 5, questions: { en: ['What small everyday thing brings you happiness?', 'Which smell, sound or place instantly takes you back in time?'], hi: ['रोज़मर्रा की कौन सी छोटी बात आपको खुशी देती है?', 'कौन सी खुशबू, आवाज़ या जगह आपको पुरानी यादों में ले जाती है?'], gu: ['રોજિંદી કઈ નાની વાત તમને ખુશી આપે છે?', 'કઈ સુગંધ, અવાજ કે જગ્યા તમને જૂની યાદોમાં લઈ જાય છે?'] } },
  { id: 'dreams', sortOrder: 6, questions: { en: ['What dream have you always carried in your heart?', 'What are you still curious to experience?'], hi: ['आपने हमेशा अपने दिल में कौन सा सपना संजोकर रखा है?', 'आप आज भी क्या नया अनुभव करना चाहते हैं?'], gu: ['તમે હંમેશા તમારા મનમાં કયું સપનું સાચવી રાખ્યું છે?', 'તમે આજે પણ કયો નવો અનુભવ કરવા માંગો છો?'] } }
];


const permanentFollowUps = {
  childhood: {
    en: [
      "Who was with you during that memory?",
      "What made playing those games so special?",
    ],
    hi: [
      "उस याद के समय आपके साथ कौन था?",
      "उन खेलों को खेलना आपके लिए इतना खास क्यों था?",
    ],
    gu: [
      "તે યાદના સમયે તમારી સાથે કોણ હતું?",
      "તે રમતો રમવી તમારા માટે આટલી ખાસ કેમ હતી?",
    ],
  },

  love: {
    en: [
      "What do you remember most clearly about that first meeting?",
      "What made you feel that way?",
    ],
    hi: [
      "उस पहली मुलाकात की कौन सी बात आपको सबसे अच्छी तरह याद है?",
      "आपको ऐसा महसूस क्यों हुआ?",
    ],
    gu: [
      "તે પહેલી મુલાકાતની કઈ વાત તમને સૌથી વધુ યાદ છે?",
      "તમને એવું કેમ લાગ્યું?",
    ],
  },

  family: {
    en: [
      "Who started this tradition in your family?",
      "What would you want to experience again about that moment?",
    ],
    hi: [
      "आपके परिवार में यह परंपरा किसने शुरू की थी?",
      "उस पल की कौन सी बात आप दोबारा अनुभव करना चाहेंगे?",
    ],
    gu: [
      "તમારા પરિવારમાં આ પરંપરા કોણે શરૂ કરી હતી?",
      "તે ક્ષણની કઈ વાત તમે ફરી અનુભવવા માંગશો?",
    ],
  },

  "life-lessons": {
    en: [
      "Can you remember the moment that taught you this lesson?",
      "What would you tell your younger self first?",
    ],
    hi: [
      "क्या आपको वह पल याद है जब आपने यह सबक सीखा था?",
      "आप अपने छोटे रूप को सबसे पहले क्या कहना चाहेंगे?",
    ],
    gu: [
      "તમને એ ક્ષણ યાદ છે જ્યારે તમે આ પાઠ શીખ્યા હતા?",
      "તમે તમારા નાના સ્વરૂપને સૌથી પહેલાં શું કહેશો?",
    ],
  },

  "little-things": {
    en: [
      "When did you first notice how much this made you happy?",
      "What memory comes to your mind when you experience it?",
    ],
    hi: [
      "आपने पहली बार कब महसूस किया कि इससे आपको कितनी खुशी मिलती है?",
      "जब आप इसे अनुभव करते हैं तो कौन सी याद आपके मन में आती है?",
    ],
    gu: [
      "તમને પહેલી વાર ક્યારે સમજાયું કે તે તમને કેટલી ખુશી આપે છે?",
      "જ્યારે તમે તેનો અનુભવ કરો છો ત્યારે કઈ યાદ તમારા મનમાં આવે છે?",
    ],
  },

  dreams: {
    en: [
      "What first inspired you to have this dream?",
      "What is one step you would still love to take toward this experience?",
    ],
    hi: [
      "इस सपने को देखने की प्रेरणा आपको सबसे पहले कहाँ से मिली?",
      "इस अनुभव की ओर बढ़ने के लिए आप आज भी कौन सा कदम उठाना चाहेंगे?",
    ],
    gu: [
      "આ સપનું જોવાની પ્રેરણા તમને સૌથી પહેલાં ક્યાંથી મળી?",
      "આ અનુભવ તરફ આગળ વધવા માટે તમે આજે પણ કયું પગલું લેવા માંગશો?",
    ],
  },
};

for (const c of categories) {
  await prisma.category.upsert({
    where: { id: c.id },
    update: { sortOrder: c.sortOrder },
    create: { id: c.id, sortOrder: c.sortOrder },
  });

  for (const [language, prompts] of Object.entries(c.questions)) {
    for (let i = 0; i < prompts.length; i++) {
      const followUp =
        permanentFollowUps[c.id]?.[language]?.[i] ||
        (language === "hi"
          ? "क्या आप इस बारे में थोड़ा और बता सकते हैं?"
          : language === "gu"
            ? "શું તમે આ વિશે થોડું વધુ કહી શકો છો?"
            : "Could you tell us a little more about this?");

      await prisma.question.upsert({
        where: {
          categoryId_language_sortOrder: {
            categoryId: c.id,
            language,
            sortOrder: i + 1,
          },
        },
        update: {
          text: prompts[i],
          permanentFollowUpText: followUp,
          isActive: true,
        },
        create: {
          categoryId: c.id,
          language,
          text: prompts[i],
          permanentFollowUpText: followUp,
          sortOrder: i + 1,
        },
      });
    }
  }
}

console.log("Seeded multilingual questions and permanent follow-ups.");
await prisma.$disconnect();

console.log('Seeded categories and multilingual questions.');
await prisma.$disconnect();
