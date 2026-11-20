const categories = [
  {key:"boy",label:"اسم ولد"},
  {key:"girl",label:"اسم بنت"},
  {key:"animal",label:"حيوان"},
  {key:"plant",label:"نبات"},
  {key:"object",label:"جماد"}
];

const wordBank = {
  "ا":[["أحمد","أدهم","أيمن"],["أمل","آية","إيمان"],["أسد","أرنب","أخطبوط"],["أرز","أناناس","أفوكادو"],["إبريق","إبرة","أريكة"]],
  "ب":[["باسم","باسل","بلال"],["بسمة","بشرى","بيان"],["بطة","بقرة","ببغاء"],["بقدونس","بصل","برتقال"],["باب","بالون","بطانية"]],
  "ت":[["تامر","تيم","توفيق"],["تاليا","تقى","تمارا"],["تمساح","تيس","تونة"],["تفاح","تين","ترمس"],["تلفاز","تاج","ترابيزة"]],
  "ج":[["جمال","جاسر","جلال"],["جميلة","جنى","جيهان"],["جمل","جاموسة","جرادة"],["جزر","جرجير","جوافة"],["جرس","جهاز","جريدة"]],
  "ح":[["حسن","حسين","حازم"],["حنان","حبيبة","حفصة"],["حصان","حمار","حوت"],["حمص","حبق","حلبة"],["حقيبة","حذاء","حائط"]],
  "د":[["داود","دانيال","دياب"],["داليا","دعاء","دينا"],["دب","دولفين","ديك"],["دوم","دراق","دُخن"],["درج","دفتر","دراجة"]],
  "ر":[["رامي","رائد","رضا"],["رانيا","ريم","رحمة"],["راكون","رنة","رخمة"],["رمان","ريحان","روزماري"],["راديو","رف","رادار"]],
  "س":[["سامي","سيف","سليم"],["سارة","سلمى","سمر"],["سمكة","سلحفاة","سنجاب"],["سبانخ","سمسم","سدر"],["ساعة","سرير","سجادة"]],
  "ع":[["عمر","علي","عادل"],["عائشة","علا","عبير"],["عقرب","عصفور","عنكبوت"],["عنب","عدس","عرقسوس"],["علبة","عجلة","عمود"]],
  "ف":[["فادي","فارس","فؤاد"],["فاطمة","فرح","فريدة"],["فيل","فهد","فراشة"],["فول","فراولة","فلفل"],["فنجان","فرن","فانوس"]],
  "ك":[["كريم","كمال","كامل"],["كوثر","كارما","كنزي"],["كلب","كنغر","كوالا"],["كرفس","كرنب","كمثرى"],["كتاب","كرسي","كوب"]],
  "م":[["محمد","محمود","مصطفى"],["مريم","منة","ملك"],["ماعز","ماعون","مهر"],["موز","مانجو","ملوخية"],["مفتاح","مكتب","مرآة"]],
  "ن":[["نبيل","ناصر","نور"],["نادية","نور","نهى"],["نمر","نحلة","نعامة"],["نعناع","نخيل","نبق"],["نظارة","نافذة","ناقوس"]],
  "ه":[["هاني","هشام","هيثم"],["هدى","هبة","هند"],["هدهد","هامستر","هرة"],["هيل","هليون","هندباء"],["هاتف","هرم","هاون"]],
  "و":[["وليد","وائل","وسيم"],["وفاء","وداد","وعد"],["وحيد القرن","وطواط","وزة"],["ورد","وَسمة","واسابي"],["وسادة","وعاء","ورقة"]],
  "ي":[["ياسر","يوسف","يحيى"],["ياسمين","يمنى","يارا"],["يمامة","يربوع","يعسوب"],["يانسون","يوسفي","يقطين"],["يافطة","ياقوت","يخت"]]
};

const normalizeWord = value => value.trim().replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/[ًٌٍَُِّْـ]/g,"").toLowerCase();

const arena = {
  round:1,
  rounds:5,
  humanScore:0,
  computerScore:0,
  letters:[],
  letter:"",
  computerWords:[],
  locked:false
};

const $ = id => document.getElementById(id);
const random = items => items[Math.floor(Math.random()*items.length)];

function createRound(){
  arena.letter=arena.letters[arena.round-1];
  arena.computerWords=wordBank[arena.letter].map(options=>random(options));
  arena.locked=false;
  $("roundLetter").textContent=arena.letter;
  $("roundNumber").textContent=arena.round+" / "+arena.rounds;
  $("humanScore").textContent=arena.humanScore;
  $("computerScore").textContent=arena.computerScore;
  $("arenaStatus").textContent="اكتب 5 إجابات تبدأ بحرف "+arena.letter;
  $("categoryFields").replaceChildren();
  categories.forEach((category,index)=>{
    const wrap=document.createElement("div");
    wrap.className="category-field";
    const label=document.createElement("label");
    label.htmlFor="categoryAnswer"+index;
    label.textContent=category.label;
    const input=document.createElement("input");
    input.id="categoryAnswer"+index;
    input.name=category.key;
    input.autocomplete="off";
    input.maxLength=28;
    input.placeholder="اكتب هنا";
    input.required=true;
    wrap.append(label,input);
    $("categoryFields").append(wrap);
  });
  $("categoryForm").hidden=false;
  $("categorySubmit").disabled=false;
  $("arenaResults").hidden=true;
  $("arenaResults").replaceChildren();
  $("nextRound").hidden=true;
}

function startGame(){
  arena.round=1;
  arena.humanScore=0;
  arena.computerScore=0;
  const letters=Object.keys(wordBank);
  arena.letters=[];
  while(arena.letters.length<arena.rounds){
    const letter=random(letters);
    if(!arena.letters.includes(letter))arena.letters.push(letter);
  }
  createRound();
}

function showResults(playerWords){
  const results=$("arenaResults");
  results.replaceChildren();
  let playerPoints=0;
  let botPoints=0;
  categories.forEach((category,index)=>{
    const player=playerWords[index];
    const bot=arena.computerWords[index];
    const playerValid=player.length>0&&normalizeWord(player).startsWith(normalizeWord(arena.letter));
    const botValid=bot.length>0&&normalizeWord(bot).startsWith(normalizeWord(arena.letter));
    const duplicate=playerValid&&botValid&&normalizeWord(player)===normalizeWord(bot);
    if(playerValid)playerPoints+=duplicate?5:10;
    if(botValid)botPoints+=duplicate?5:10;
    const row=document.createElement("div");
    row.className="arena-result-row";
    const playerCell=document.createElement("div");
    playerCell.className="arena-result-cell"+(playerValid?" winner":"");
    const playerLabel=document.createElement("small");
    playerLabel.textContent="إجابتك · "+category.label;
    const playerValue=document.createElement("strong");
    playerValue.textContent=player||"—";
    playerCell.append(playerLabel,playerValue);
    const botCell=document.createElement("div");
    botCell.className="arena-result-cell"+(duplicate?" duplicate":"");
    const botLabel=document.createElement("small");
    botLabel.textContent="إجابة الكمبيوتر";
    const botValue=document.createElement("strong");
    botValue.textContent=bot;
    botCell.append(botLabel,botValue);
    row.append(playerCell,botCell);
    results.append(row);
  });
  arena.humanScore+=playerPoints;
  arena.computerScore+=botPoints;
  $("humanScore").textContent=arena.humanScore;
  $("computerScore").textContent=arena.computerScore;
  const summary=document.createElement("div");
  summary.className="visual-note";
  summary.textContent="نقاط الجولة: أنت +"+playerPoints+" · الكمبيوتر +"+botPoints;
  results.prepend(summary);
  results.hidden=false;
  $("categoryForm").hidden=true;
  $("nextRound").hidden=false;
  $("nextRound").textContent=arena.round===arena.rounds?"اعرض النتيجة النهائية":"الجولة التالية ←";
  $("arenaStatus").textContent="الكمبيوتر خلّص إجاباته! شوفوا مين جمع نقاط أكتر.";
}

$("categoryForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(arena.locked)return;
  const playerWords=categories.map((category,index)=>$("categoryAnswer"+index).value.trim());
  if(playerWords.some(word=>!word)){
    $("arenaStatus").textContent="كمّل الخمس إجابات الأول.";
    return;
  }
  arena.locked=true;
  $("categorySubmit").disabled=true;
  $("arenaStatus").textContent="🤖 الكمبيوتر بيفكر وبيجهّز إجاباته...";
  const fields=[...$("categoryFields").querySelectorAll("input")];
  fields.forEach((field,index)=>setTimeout(()=>field.classList.add("computer-thinking"),index*100));
  setTimeout(()=>showResults(playerWords),950);
});

$("nextRound").addEventListener("click",()=>{
  if(arena.round===arena.rounds){
    const winner=arena.humanScore===arena.computerScore?"تعادل!":arena.humanScore>arena.computerScore?"كسبت الكمبيوتر!":"الكمبيوتر كسب الجولة دي!";
    $("arenaStatus").textContent=winner+" النتيجة النهائية: "+arena.humanScore+" - "+arena.computerScore;
    $("nextRound").hidden=true;
    return;
  }
  arena.round++;
  createRound();
});

$("restartArena").addEventListener("click",startGame);
startGame();
