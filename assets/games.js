import { supabase } from "./supabase.js";

const puzzles = [
{title:"لغز الميزان الثلاثي",category:"معادلات",level:"متوسط",question:"قطة + كلب = 15 كجم\nقطة + أرنب = 8 كجم\nكلب + أرنب = 11 كجم\n\nكم يزن الأرنب بمفرده؟",answers:["2","٢"],hint:"اجمع المعادلتين الثانية والثالثة، ثم اطرح مجموع القطة والكلب.",solution:"بجمع الثانية والثالثة: قطة + كلب + 2 أرنب = 19. وبما أن قطة + كلب = 15، إذن 2 أرنب = 4، والأرنب = 2 كجم."},
{title:"لغز الصناديق والمفاتيح",category:"معادلات",level:"متوسط",question:"صندوق + مفتاح + قفل = 30\nصندوق + مفتاح = 22\nقفل + مفتاح = 16\n\nما قيمة الصندوق ناقص القفل؟",answers:["6","٦"],hint:"اطرح المعادلة الثانية من الأولى لتعرف قيمة القفل.",solution:"القفل = 30 - 22 = 8، والمفتاح = 8، والصندوق = 14. المطلوب 14 - 8 = 6."},
{title:"لغز الحذف الذكي",category:"معادلات",level:"سهل",question:"2 تفاحة + برتقالة = 14\nتفاحة + 2 برتقالة = 16\n\nكم تساوي تفاحة + برتقالة؟",answers:["10","١٠"],hint:"اجمع المعادلتين؛ ستحصل على 3 تفاحات + 3 برتقالات.",solution:"بجمع المعادلتين: 3 تفاحات + 3 برتقالات = 30. بالقسمة على 3، تفاحة + برتقالة = 10."},
{title:"لغز الأشكال",category:"معادلات",level:"صعب",question:"دائرة + مثلث + مربع = 24\nدائرة + دائرة + مثلث = 22\nمربع + مثلث + مثلث = 23\n\nما قيمة المربع؟",answers:["29/3","9.6667","9.67","٩٫٦٧"],hint:"سمّي الدائرة د، والمثلث م، والمربع س. ابدأ من المعادلة الثانية.",solution:"من الثانية: المثلث = 22 - 2 دائرة. ومن الثالثة: المربع = 23 - 2 مثلث. بالتعويض: الدائرة = 23/3، والمثلث = 20/3، والمربع = 29/3 ≈ 9.67. الأرقام المعطاة تؤدي إلى قيمة كسرية."},
{title:"لغز أوزان المزرعة",category:"معادلات",level:"متوسط",question:"بقرة + حصان = 420 كجم\nحصان + خروف = 230 كجم\nبقرة + خروف = 310 كجم\n\nكم يزن الحصان؟",answers:["170","١٧٠"],hint:"اجمع أول معادلتين واطرح منهما المعادلة الثالثة.",solution:"2 حصان = 420 + 230 - 310 = 340، إذن الحصان = 170 كجم."},
{title:"النمط المخفي",category:"أنماط",level:"سهل",question:"ما الرقم التالي؟\n2، 6، 12، 20، 30، ؟",answers:["42","٤٢"],hint:"احسب الفرق بين كل رقم واللي بعده.",solution:"الفروق 4، 6، 8، 10؛ الفرق التالي 12، إذن الرقم التالي 42."},
{title:"ضاعف الرقم",category:"أنماط",level:"سهل",question:"ما الرقم الناقص؟\n3، 9، 27، 81، ؟",answers:["243","٢٤٣"],hint:"كل رقم بيتضرب في نفس العدد للوصول للي بعده.",solution:"كل مرة نضرب في 3: 81 × 3 = 243."},
{title:"لغز الأعمار",category:"منطق",level:"متوسط",question:"عمر الأب 36 سنة وعمر ابنه 6 سنوات.\nبعد كام سنة يصبح عمر الأب ضعف عمر الابن؟",answers:["24","٢٤"],hint:"بعد س سنة: عمر الأب 36 + س، والابن 6 + س.",solution:"36 + س = 2 × (6 + س)، ومنها س = 24 سنة."},
{title:"المفاتيح والمصباح",category:"منطق",level:"صعب",question:"أمامك 3 مفاتيح خارج غرفة مغلقة، وداخل الغرفة مصباح واحد. مفتاح واحد فقط يشغّل المصباح. مسموح تدخل الغرفة مرة واحدة فقط. كيف تعرف المفتاح الصحيح؟",answers:["الحرارة","شغل الاول ثم اطفيه وشغل الثاني","الأول والثاني"],hint:"المصباح لا يعطيك معلومة من الضوء فقط؛ فكر في أثر تشغيله لفترة.",solution:"شغّل المفتاح الأول عدة دقائق ثم أطفئه. شغّل الثاني وادخل: إن كان المصباح منيرًا فالثاني صحيح. إن كان مطفأ ودافئًا فالأول صحيح. إن كان مطفأ وباردًا فالثالث صحيح."},
{title:"عبور النهر",category:"منطق",level:"صعب",question:"مزارع معه ذئب وماعز وكرنب، والقارب يحمل المزارع وشيئًا واحدًا فقط. لا يمكن ترك الذئب مع الماعز وحدهما، ولا الماعز مع الكرنب. ما الترتيب؟",answers:["الماعز الذئب الماعز الكرنب الماعز","الماعز ثم الذئب ثم الماعز ثم الكرنب"],hint:"ابدأ بالشيء الذي لا يمكن تركه مع أي من الاثنين الآخرين.",solution:"ينقل الماعز أولًا ويعود وحده. ينقل الذئب ثم يعيد الماعز. يترك الماعز وينقل الكرنب، ثم يعود وحده وينقل الماعز أخيرًا."},
{title:"العملة الأثقل",category:"تفكير استراتيجي",level:"صعب",question:"معك 8 عملات متطابقة في الشكل، واحدة أثقل من الباقي. لديك ميزان ذو كفتين، ومسموح تستخدمه مرتين فقط. كيف تحدد العملة الأثقل؟",answers:["3 ضد 3 ثم 1 ضد 1","3 3 2","اقسمهم 3 و3 و2"],hint:"قسّم العملات إلى 3 مجموعات: 3 و3 و2.",solution:"زن 3 مقابل 3. إن رجحت كفة، زن عملتين من الثلاثة الأثقل مقابل بعضهما؛ إن تساوتا فالثالثة هي الأثقل. إن تساوت الكفتان أولًا، زن العملتين المتبقيتين واحدة مقابل الأخرى."},
{title:"لغز الرقمين",category:"تفكير استراتيجي",level:"متوسط",question:"رقمان مجموعهما 20، والفرق بينهما 6. ما حاصل ضربهما؟",answers:["91","٩١"],hint:"الرقمان مجموعهما 20 والفرق بينهما 6.",solution:"الرقمان 13 و7؛ حاصل الضرب 13 × 7 = 91."}
];

puzzles.forEach((p,i)=>{
  p.id=p.id||"fixed-"+i;
  p.visualType=i===0?"balance":i<=4?"equation":i<=6?"sequence":"logic";
});

const $ = id => document.getElementById(id);
const storageKey = "personalSpaceGames:v2";
const seenKey = "personalSpaceGames:generated:v1";
let seenGenerated = new Set();
let currentIndex = 0;
let attempts = 0;
let solved = new Set();
let hintLevel = 0;
let revealed = false;
let stats = {solved:[],attempts:0};
try {
  const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem("personalSpaceGames:v1")||"{}");
  stats = {...stats,...saved};
  solved = new Set((stats.solved||[]).map(id=>typeof id==="number"?"fixed-"+id:id));
  seenGenerated = new Set(JSON.parse(localStorage.getItem(seenKey)||"[]"));
} catch {}


function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function makeGeneratedPuzzle(){
  for(let tries=0;tries<100;tries++){
    if(Math.random()<0.68){
      const x=rand(2,24),y=rand(2,24);
      let a=rand(1,6),b=rand(1,6),c=rand(1,6),d=rand(1,6);
      if(a*d-b*c===0) continue;
      const q1=a*x+b*y,q2=c*x+d*y;
      const question=`إذا كان:
${a}س + ${b}ص = ${q1}
${c}س + ${d}ص = ${q2}

فما قيمة س؟`;
      const id="gen-"+question;
      if(seenGenerated.has(id)) continue;
      seenGenerated.add(id);
      return {id,generated:true,visualType:"equation",title:"معادلتان ومجهولان",category:"معادلات",level:x>16||y>16?"صعب":"متوسط",question,answers:[String(x)],numericAnswer:x,hint:"استخدم الحذف أو التعويض للتخلص من أحد المجهولين.",solution:`بحل المعادلتين معًا نجد س = ${x}، وص = ${y}. بالتعويض: ${a}×${x} + ${b}×${y} = ${q1}، والمعادلة الثانية صحيحة أيضًا.`};
    }
    const type=rand(0,2);
    let seq=[],answer,title,hint,solution;
    if(type===0){
      const start=rand(1,25),step=rand(2,12);
      seq=Array.from({length:5},(_,i)=>start+i*step);answer=start+5*step;
      title="اكتشف النمط الحسابي";hint="راقب مقدار الزيادة بين كل رقم والذي يليه.";solution=`الفرق ثابت ويساوي ${step}، إذن الرقم التالي ${answer}.`;
    }else if(type===1){
      const start=rand(2,8),factor=rand(2,4);
      seq=Array.from({length:5},(_,i)=>start*factor**i);answer=start*factor**5;
      title="تحدي التضاعف";hint="ابحث عن العدد الذي نضرب فيه كل مرة.";solution=`كل رقم يُضرب في ${factor}، إذن ${seq[4]} × ${factor} = ${answer}.`;
    }else{
      const start=rand(1,8);
      seq=Array.from({length:5},(_,i)=>(start+i)**2);answer=(start+5)**2;
      title="مربعات متتابعة";hint="فكر في الجذر التربيعي لكل رقم.";solution=`الأرقام مربعات متتالية: ${start}²، ${start+1}²... لذلك التالي ${start+5}² = ${answer}.`;
    }
    const question="ما الرقم التالي في النمط؟\n"+seq.join("، ")+"، ؟";
    const id="gen-"+question;
    if(seenGenerated.has(id)) continue;
    seenGenerated.add(id);
    return {id,generated:true,visualType:"sequence",title,category:"أنماط",level:"سهل",question,answers:[String(answer)],numericAnswer:answer,hint,solution};
  }
  return null;
}
function addGeneratedPuzzle(){
  const puzzle=makeGeneratedPuzzle();
  if(!puzzle){
    $("feedback").textContent="وصلنا لمجموعة كبيرة من الأنماط. حاول مرة أخرى لتوليد لغز مختلف.";
    return;
  }
  puzzles.push(puzzle);
  try{localStorage.setItem(seenKey,JSON.stringify([...seenGenerated].slice(-5000)));}catch{}
  $("totalCount").textContent="∞";
  selectPuzzle(puzzles.length-1);
}
function normalize(value) {
  return String(value||"").trim().toLowerCase()
    .replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[٫،]/g,".").replace(/\s+/g,"")
    .replace(/كجم|سنة/g,"").replace(/[أإآ]/g,"ا");
}
function saveStats() {
  stats.solved=[...solved];
  localStorage.setItem(storageKey,JSON.stringify(stats));
  $("solvedCount").textContent=solved.size;
  $("successRate").textContent=stats.attempts?Math.round(solved.size/stats.attempts*100)+"%":"0%";
  $("xpCount").textContent=solved.size*25;
}
function renderList() {
  $("puzzleList").replaceChildren();
  const start=Math.max(0,puzzles.length-24);
  puzzles.slice(start).forEach((p,offset)=>{
    const i=start+offset;
    const button=document.createElement("button");
    button.type="button";
    button.className="puzzle-choice"+(i===currentIndex?" active":"");
    const title=document.createElement("strong");
    title.textContent=(solved.has(p.id)?"✓ ":"")+(i+1)+". "+p.title;
    const meta=document.createElement("span");
    meta.textContent=p.category+" · "+p.level;
    button.append(title,meta);
    button.addEventListener("click",()=>selectPuzzle(i));
    $("puzzleList").append(button);
  });
}

function node(tag,className,text){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
}
function renderVisualStage(p){
  const stage=$("visualStage");
  stage.replaceChildren();
  const heading=node("div","visual-heading");
  heading.append(node("strong","",p.visualType==="balance"?"جرّب تكتشف العلاقة":p.visualType==="sequence"?"كمّل النمط بنفسك":p.visualType==="equation"?"لوحة المعادلات":"فكّر في الخطوات"));
  heading.append(node("span","",p.visualType==="balance"?"تفاعل بصري":p.visualType==="sequence"?"تحدي الأرقام":"عرض تفاعلي"));
  stage.append(heading);
  if(p.visualType==="balance"){
    const wrap=node("div","visual-balance");
    const animals=node("div","visual-animal-row");
    const equations=node("div","visual-equations");
    const items=[["🐱","قطة"],["🐶","كلب"],["🐰","أرنب"]];
    items.forEach(([emoji,name])=>{
      const chip=node("div","animal-chip");
      const btn=node("button","",emoji);
      btn.type="button";btn.setAttribute("aria-label","حدد "+name);
      btn.addEventListener("click",()=>{
        animals.querySelectorAll(".animal-chip").forEach(x=>x.classList.remove("active"));
        chip.classList.add("active");
        equations.querySelectorAll(".visual-equation").forEach(row=>row.classList.toggle("selected",row.dataset.items.includes(name)));
      });
      chip.append(btn,node("small","",name));animals.append(chip);
    });
    const beam=node("div","balance-beam");
    const base=node("div","balance-base");
    wrap.append(animals,beam,base);
    const lines=p.question.split("\n").filter(line=>line.includes("="));
    lines.forEach(line=>{
      const row=node("div","visual-equation",line);
      row.dataset.items=["قطة","كلب","أرنب"].filter(name=>line.includes(name)).join("|");
      row.addEventListener("click",()=>{
        equations.querySelectorAll(".visual-equation").forEach(x=>x.classList.remove("selected"));
        row.classList.add("selected");
      });
      equations.append(row);
    });
    wrap.append(equations,node("div","visual-note","اضغط على حيوان أو معادلة لمتابعة العلاقات بينها"));
    stage.append(wrap);return;
  }
  if(p.visualType==="sequence"){
    const numbers=(p.question.match(/-?\d+(?:\.\d+)?/g)||[]).slice(0,7);
    const grid=node("div","visual-grid");
    numbers.forEach((number,i)=>grid.append(node("div","visual-tile",number)));
    grid.append(node("div","visual-tile missing","?"));
    stage.append(grid,node("div","visual-note","راقب الفرق أو طريقة الضرب بين الأرقام، ثم أدخل الرقم الناقص"));
    return;
  }
  if(p.visualType==="equation"){
    const equations=node("div","visual-equations");
    const lines=p.question.split("\n").filter(line=>line.includes("="));
    lines.forEach(line=>{
      const row=node("div","visual-equation");
      const parts=line.split("=");
      row.append(node("span","",parts[0].trim()+"  =  "),node("strong","",parts.slice(1).join("=").trim()));
      equations.append(row);
    });
    const symbols=node("div","visual-grid");
    [["➕","اجمع الحدود"],["➖","احذف حدًا متشابهًا"],["🧩","اعزل المجهول"]].forEach(([icon,label])=>{
      const tile=node("div","visual-tile");
      tile.append(node("strong","",icon),node("small","",label));symbols.append(tile);
    });
    stage.append(equations,symbols);return;
  }
  const logic=node("div","visual-grid");
  [["🧠","حلّل المعطيات"],["🔍","ابحث عن الدليل"],["🎯","اختبر الحل"]].forEach(([icon,label])=>{
    const tile=node("div","visual-tile");tile.append(node("strong","",icon),node("small","",label));logic.append(tile);
  });
  stage.append(logic,node("div","visual-note","قسّم اللغز إلى خطوات صغيرة قبل اختيار إجابتك"));
}
function celebrate(){
  const card=document.querySelector(".game-card");
  card.classList.remove("success");void card.offsetWidth;card.classList.add("success");
  const feedback=$("feedback");feedback.classList.remove("good");void feedback.offsetWidth;feedback.classList.add("good");
  const colors=["#73a7ff","#54d6a0","#f4c76b","#ff8e8e"];
  for(let i=0;i<18;i++){
    const bit=node("span","confetti",["✦","●","◆"][i%3]);
    bit.style.left=(5+Math.random()*90)+"%";
    bit.style.top=(12+Math.random()*35)+"%";
    bit.style.color=colors[i%colors.length];
    card.append(bit);
    setTimeout(()=>bit.remove(),1100);
  }
}

function renderPuzzle() {
  const p=puzzles[currentIndex];
  attempts=0;hintLevel=0;revealed=solved.has(p.id);
  $("puzzleNumber").textContent="لغز "+(currentIndex+1)+(p.generated?" · مولّد تلقائيًا":" · من المجموعة الأساسية");
  $("difficulty").textContent=p.level;
  $("puzzleTitle").textContent=p.title;
  $("category").textContent=p.category;
  $("question").textContent=p.question;
  renderVisualStage(p);
  $("progressFill").style.width=((solved.size%5)/5*100)+"%";
  $("xpCount").textContent=solved.size*25;
  document.querySelector(".game-card").classList.remove("success");
  $("attempts").textContent="";
  $("answerInput").value="";
  $("answerInput").disabled=revealed;
  $("feedback").className="feedback";
  $("feedback").textContent=revealed?"أنت حليت اللغز ده قبل كده. تقدر تراجع الحل.":"خد وقتك وفكر قبل ما تجاوب.";
  $("hint").hidden=true;$("hint").textContent="";
  $("explanation").hidden=!revealed;
  $("explanation").textContent=revealed?"الحل: "+p.solution:"";
  $("solutionButton").disabled=revealed;$("hintButton").disabled=revealed;
  $("nextButton").disabled=false;
  renderList();
}
function selectPuzzle(i){currentIndex=i;renderPuzzle();}
function isCorrect(value) {
  const v=normalize(value);
  const answers=puzzles[currentIndex].answers.map(normalize);
  if(answers.includes(v)) return true;
  if(puzzles[currentIndex].numericAnswer!==undefined && Math.abs(Number(v)-puzzles[currentIndex].numericAnswer)<0.0001) return true;
  if(currentIndex===3 && Math.abs(Number(v)-29/3)<0.02) return true;
  if(currentIndex===8 && v.includes("اول")&&v.includes("اطفي")&&v.includes("ثاني")) return true;
  if(currentIndex===9 && v.includes("ماعز")&&v.includes("ذئب")&&v.includes("كرنب")) return true;
  if(currentIndex===10 && v.includes("3")&&v.includes("1")) return true;
  return false;
}
$("answerForm").addEventListener("submit",e=>{
  e.preventDefault();if(revealed)return;
  attempts++;stats.attempts++;
  $("attempts").textContent="محاولاتك: "+attempts;
  if(isCorrect($("answerInput").value)){
    solved.add(puzzles[currentIndex].id);revealed=true;$("answerInput").disabled=true;
    $("feedback").className="feedback good";
    $("feedback").textContent="إجابة صحيحة! ممتاز، كسبت 25 نقطة خبرة ⭐";
    celebrate();
    $("explanation").hidden=false;$("explanation").textContent="الحل: "+puzzles[currentIndex].solution;
    $("solutionButton").disabled=true;$("hintButton").disabled=true;
  } else {
    $("feedback").className="feedback bad";
    $("feedback").textContent="مش دي الإجابة. راجع المعطيات وجرب مرة تانية.";
  }
  saveStats();renderList();
});
$("hintButton").addEventListener("click",()=>{
  if(revealed)return;
  hintLevel=Math.min(hintLevel+1,2);$("hint").hidden=false;
  $("hint").textContent=hintLevel===1?"تلميح: "+puzzles[currentIndex].hint:"تلميح إضافي: حوّل المعطيات لخطوات صغيرة وابدأ بعلاقة واحدة واضحة.";
});
$("solutionButton").addEventListener("click",()=>{
  $("explanation").hidden=false;$("explanation").textContent="الحل: "+puzzles[currentIndex].solution;
  $("feedback").className="feedback bad";$("feedback").textContent="عرضت الحل. جرّب اللغز التالي بنفسك.";
  $("answerInput").disabled=true;revealed=true;$("hintButton").disabled=true;$("solutionButton").disabled=true;
});
$("nextButton").addEventListener("click",()=>{if(currentIndex<puzzles.length-1)selectPuzzle(currentIndex+1);else addGeneratedPuzzle();});
$("signOut").addEventListener("click",async()=>{
  $("signOut").disabled=true;
  const {error}=await supabase.auth.signOut();
  if(error){$("signOut").disabled=false;$("feedback").textContent="تعذر تسجيل الخروج. حاول مرة أخرى.";return;}
  window.location.replace("/");
});
const {data,error}=await supabase.auth.getSession();
if(error||!data.session){window.location.replace("/");}
else{$("totalCount").textContent="∞";saveStats();renderPuzzle();}
