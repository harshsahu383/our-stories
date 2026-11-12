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
for (const c of categories) {
  await prisma.category.upsert({ where: { id: c.id }, update: { sortOrder: c.sortOrder }, create: { id: c.id, sortOrder: c.sortOrder } });
  for (const [language, prompts] of Object.entries(c.questions)) {
    for (let i = 0; i < prompts.length; i++) {
      await prisma.question.upsert({ where: { categoryId_language_sortOrder: { categoryId: c.id, language, sortOrder: i + 1 } }, update: { text: prompts[i], isActive: true }, create: { categoryId: c.id, language, text: prompts[i], sortOrder: i + 1 } });
    }
  }
}
console.log('Seeded categories and multilingual questions.');
await prisma.$disconnect();
