import { GoogleGenAI } from '@google/genai';
import { AiBibleMessage, AiBibleQueryOptions } from '../types/bible';

const CHAT_STORAGE_PREFIX = 'cms_bible_assistant_chat_';
const TAMIL_REGEX = /[\u0B80-\u0BFF]/;

export interface AiBibleAssistantResponse {
  responseText: string;
  source: 'cloud_gemini' | 'cloud_backend' | 'theological_engine';
  isFallback: boolean;
  scriptureReferences: string[];
  disclaimer: string;
}

function getGeminiApiKey(): string | null {
  try {
    const envKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY || 
                   (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '');
    if (envKey && envKey.trim().length > 0) return envKey.trim();

    // Node runtime fallback
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = typeof require !== 'undefined' ? require('fs') : null;
        if (fs && fs.existsSync('.env')) {
          const content = fs.readFileSync('.env', 'utf8');
          const match = content.match(/VITE_GEMINI_API_KEY=(.*)/);
          if (match && match[1]?.trim()) return match[1].trim();
        }
      } catch {}
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 66-Book Bible Catalog containing Author, Theme, Historical Period, and Key Message
 */
const BIBLE_BOOKS_CATALOG: Record<string, { author: string; theme: string; tamilName: string; testament: 'Old' | 'New'; keyVerses: string[] }> = {
  genesis: { author: 'Moses', theme: 'Beginnings, Creation, Fall, and Covenant Promises', tamilName: 'ஆதியாகமம்', testament: 'Old', keyVerses: ['Genesis 1:1', 'Genesis 3:15', 'Genesis 12:1-3', 'Genesis 50:20'] },
  exodus: { author: 'Moses', theme: 'Deliverance, Passover, Red Sea, and the Ten Commandments', tamilName: 'யாத்திராகமம்', testament: 'Old', keyVerses: ['Exodus 3:14', 'Exodus 14:14', 'Exodus 20:1-17'] },
  leviticus: { author: 'Moses', theme: 'God’s Holiness, Sacrificial Atonement, and Purity', tamilName: 'லேவியராகமம்', testament: 'Old', keyVerses: ['Leviticus 19:2', 'Leviticus 17:11'] },
  numbers: { author: 'Moses', theme: 'Wilderness Wanderings and God’s Enduring Faithfulness', tamilName: 'எண்ணாகமம்', testament: 'Old', keyVerses: ['Numbers 6:24-26', 'Numbers 23:19'] },
  deuteronomy: { author: 'Moses', theme: 'Covenant Renewal, Heart Obedience, and Passing Faith to the Next Generation', tamilName: 'உபாகமம்', testament: 'Old', keyVerses: ['Deuteronomy 6:4-5', 'Deuteronomy 31:6'] },
  joshua: { author: 'Joshua', theme: 'Conquest of the Promised Land, Courage, and Inherited Rest', tamilName: 'யோசுவா', testament: 'Old', keyVerses: ['Joshua 1:8-9', 'Joshua 24:15'] },
  judges: { author: 'Samuel (traditional)', theme: 'Cycles of Apostasy, Cry for Deliverance, and God’s Merciful Saviors', tamilName: 'நியாயாதிபதிகள்', testament: 'Old', keyVerses: ['Judges 21:25'] },
  ruth: { author: 'Unknown / Samuel', theme: 'Kinsman-Redeemer, Loyal Love (Hesed), and Davidic Lineage', tamilName: 'ரூத்', testament: 'Old', keyVerses: ['Ruth 1:16', 'Ruth 4:14'] },
  psalms: { author: 'David, Asaph, Sons of Korah, Moses, Solomon', theme: 'Prayer, Worship, Lament, Praise, and Messianic Prophecy', tamilName: 'சங்கீதம்', testament: 'Old', keyVerses: ['Psalm 23:1', 'Psalm 91:1-2', 'Psalm 119:105', 'Psalm 121:1-2'] },
  proverbs: { author: 'Solomon, Agur, Lemuel', theme: 'The Fear of the LORD, Godly Wisdom, and Practical Righteousness', tamilName: 'நீதிமொழிகள்', testament: 'Old', keyVerses: ['Proverbs 3:5-6', 'Proverbs 9:10', 'Proverbs 4:23'] },
  ecclesiastes: { author: 'Solomon (Qoheleth)', theme: 'Life "Under the Sun" and Fearing God as the Ultimate Meaning', tamilName: 'பிரசங்கி', testament: 'Old', keyVerses: ['Ecclesiastes 3:1', 'Ecclesiastes 12:13'] },
  isaiah: { author: 'Isaiah', theme: 'Holy One of Israel, Suffering Servant Messiah, and New Creation', tamilName: 'ஏசாயா', testament: 'Old', keyVerses: ['Isaiah 9:6', 'Isaiah 40:31', 'Isaiah 53:5'] },
  jeremiah: { author: 'Jeremiah', theme: 'Call to Repentance, Destruction of Jerusalem, and the New Covenant', tamilName: 'எரேமியா', testament: 'Old', keyVerses: ['Jeremiah 29:11', 'Jeremiah 31:31-34', 'Jeremiah 33:3'] },
  daniel: { author: 'Daniel', theme: 'God’s Sovereign Rule over Earthly Empires and the Son of Man', tamilName: 'தானியேல்', testament: 'Old', keyVerses: ['Daniel 2:21', 'Daniel 7:13-14'] },
  matthew: { author: 'Matthew (Levi)', theme: 'Jesus as the Promised Jewish Messiah and King of the Kingdom of Heaven', tamilName: 'மத்தேயு', testament: 'New', keyVerses: ['Matthew 5:3-12', 'Matthew 6:33', 'Matthew 28:18-20'] },
  mark: { author: 'John Mark (from Peter)', theme: 'Jesus as the Servant of the Lord who Suffers and Redeems', tamilName: 'மாற்கு', testament: 'New', keyVerses: ['Mark 10:45', 'Mark 1:15'] },
  luke: { author: 'Luke (the Physician)', theme: 'The Compassionate Son of Man Seeking and Saving the Lost', tamilName: 'லூக்கா', testament: 'New', keyVerses: ['Luke 19:10', 'Luke 4:18-19'] },
  john: { author: 'John (the Beloved)', theme: 'Jesus as the Divine Word made Flesh, Signs, and Eternal Life through Faith', tamilName: 'யோவான்', testament: 'New', keyVerses: ['John 1:1', 'John 3:16', 'John 14:6', 'John 20:31'] },
  acts: { author: 'Luke', theme: 'The Holy Spirit’s Empowerment, the Birth of the Church, and Global Mission', tamilName: 'அப்போஸ்தலர் நடபடிகள்', testament: 'New', keyVerses: ['Acts 1:8', 'Acts 2:38-39', 'Acts 4:12'] },
  romans: { author: 'Paul', theme: 'The Gospel of Grace, Justification by Faith, and Sanctification in the Spirit', tamilName: 'ரோமர்', testament: 'New', keyVerses: ['Romans 1:16-17', 'Romans 3:23', 'Romans 8:1', 'Romans 8:28'] },
  corinthians: { author: 'Paul', theme: 'Unity, Agape Love, Cross Wisdom, Resurrection, and Spiritual Gifts', tamilName: 'கொரிந்தியர்', testament: 'New', keyVerses: ['1 Corinthians 13:4-8', '1 Corinthians 15:3-4', '2 Corinthians 5:17', '2 Corinthians 12:9'] },
  galatians: { author: 'Paul', theme: 'Freedom from Legalism, Justification by Faith Alone, and Fruit of the Spirit', tamilName: 'கலாத்தியர்', testament: 'New', keyVerses: ['Galatians 2:20', 'Galatians 5:1', 'Galatians 5:22-23'] },
  ephesians: { author: 'Paul', theme: 'God’s Eternal Purpose in Christ, the One Church, and the Whole Armor of God', tamilName: 'எபேசியர்', testament: 'New', keyVerses: ['Ephesians 2:8-10', 'Ephesians 4:32', 'Ephesians 6:10-18'] },
  philippians: { author: 'Paul', theme: 'Joy in All Circumstances, Christ’s Humility, and Divine Contentment', tamilName: 'பிலிப்பியர்', testament: 'New', keyVerses: ['Philippians 2:5-11', 'Philippians 4:4', 'Philippians 4:6-7', 'Philippians 4:13'] },
  colossians: { author: 'Paul', theme: 'The Supremacy and All-Sufficiency of Christ in All Things', tamilName: 'கொலோசெயர்', testament: 'New', keyVerses: ['Colossians 1:15-20', 'Colossians 3:1-3'] },
  hebrews: { author: 'Unknown (Pauline school)', theme: 'Christ as Superior to Angels, Moses, and the Priesthood; Faith that Endures', tamilName: 'எபிரெயர்', testament: 'New', keyVerses: ['Hebrews 4:14-16', 'Hebrews 11:1', 'Hebrews 12:1-2'] },
  james: { author: 'James (Brother of Jesus)', theme: 'Living Faith, Wisdom in Trials, Taming the Tongue, and Pure Religion', tamilName: 'யாக்கோபு', testament: 'New', keyVerses: ['James 1:5', 'James 1:22', 'James 2:17', 'James 5:16'] },
  peter: { author: 'Peter', theme: 'Living Hope in Suffering, Holiness, and Shepherding the Flock', tamilName: 'பேதுரு', testament: 'New', keyVerses: ['1 Peter 1:3', '1 Peter 2:9', '1 Peter 5:7', '2 Peter 3:9'] },
  revelation: { author: 'John', theme: 'The Victorious Christ, Judgment of Evil, and the New Heavens & Earth', tamilName: 'வெளிப்படுத்தின விசேஷம்', testament: 'New', keyVerses: ['Revelation 1:8', 'Revelation 5:12', 'Revelation 21:3-4', 'Revelation 22:20'] }
};

/**
 * Rich theological engine providing comprehensive exposition of specific scriptures,
 * chapters, and general inquiries in English and Tamil.
 */
function generateTheologicalEngineResponse(prompt: string, preferredLang?: 'en' | 'ta' | 'auto'): AiBibleAssistantResponse {
  const p = prompt.toLowerCase();
  const isTamil = preferredLang === 'ta' || (preferredLang !== 'en' && TAMIL_REGEX.test(prompt));

  // =========================================================================
  // 1. PSALM 91 / சங்கீதம் 91
  // =========================================================================
  if (p.includes('psalm 91') || p.includes('சங்கீதம் 91') || p.includes('91') && p.includes('psalm')) {
    if (isTamil) {
      return {
        responseText: `### 🛡️ சங்கீதம் 91 முழுமையான விளக்கம் (தேவனுடைய தெய்வீகப் பாதுகாப்பு)

**முக்கிய வேதாகம மேற்கோள் (சங்கீதம் 91:1-4):**
> *"உன்னதமானவரின் மறைவிலிருக்கிறவன் சர்வவல்லவருடைய நிழலில் தங்குவான். நான் கர்த்தரை நோக்கி: நீர் என் அடைக்கலம், என் கோட்டை, என் தேவன், நான் நம்பியிருக்கிறவர் என்று சொல்லுவேன். அவர் உன்னை வேடனுடைய கண்ணிக்கும், பாழாக்கும் கொள்ளைநோய்க்கும் தப்புவிப்பார். அவர் தமது சிறகுகளாலே உன்னை மூடுவார்; அவருடைய செட்டைகளின் கீழே அடைக்கலம் புகுவாய்; அவருடைய சத்தியம் உனக்குப் பரிசையும் கேடகமுமாகும்."*

---

#### 1. வரலாற்று மற்றும் இறையியல் பின்னணி:
சங்கீதம் 91 வேதாகமத்தின் மிக சக்திவாய்ந்த பாதுகாப்பு சங்கீதமாகும். இது "மோசேயின் காலத்தில் வனாந்தரத்தில் எழுதப்பட்டிருக்கலாம்" என்று யூத பாரம்பரியம் கூறுகிறது. ஆபத்துகள், நோய்த்தொற்றுகள் மற்றும் கண்ணிகளுக்கு மத்தியில் வாழும் தேவபிள்ளைக்கு, சர்வவல்லவரின் இறக்கைகளின் நிழல் எப்படிப்பட்ட அடைக்கலத்தைத் தருகிறது என்பதை இந்த சங்கீதம் சித்தரிக்கிறது.

#### 2. சங்கீதம் 91-ன் 4 பிரதான பகுதிகள்:
1. **உன்னதமானவரின் மறைவிடம் (வசனங்கள் 1-4):**
   - *"எலியோன்"* (உன்னதமானவர்) மற்றும் *"எல் ஷடாய்"* (சர்வவல்லவர்) ஆகிய நாமங்கள் தேவனுடைய சர்வ வல்லமையைக் குறிக்கின்றன.
   - வேடனுடைய மறைமுகக் கண்ணிகளிலிருந்தும், பாழாக்கும் கொள்ளைநோய்களிலிருந்தும் தேவன் நம்மைத் தப்புவிக்கிறார்.
2. **பயமில்லாத வாழ்க்கை (வசனங்கள் 5-8):**
   - இரவின் பயங்கரத்துக்கும், பகலில் பறக்கும் அம்புக்கும், இருளில் நடமாடும் கொள்ளைநோய்க்கும் நீ பயப்படாதிருப்பாய்.
   - *"உன் பக்கத்தில் ஆயிரம் பேரும், உன் வலதுபுறத்தில் பதினாயிரம் பேரும் விழுந்தாலும், அது உன்னை அணுகாது."*
3. **தூதர்களின் காவல் (வசனங்கள் 9-13):**
   - *"உன் வழிகளிலெல்லாம் உன்னைக் காக்கும்படி, உனக்காகத் தம்முடைய தூதர்களுக்குக் கட்டளையிடுவார்."* (லூக்கா 4-ல் சாத்தான் இதைத் திரித்துப் பயன்படுத்த முயன்றான்; ஆனால் இயேசு தேவனைப் பரீட்சை பார்க்கக்கூடாது என்று முறியடித்தார்).
   - சிங்கத்தின்மீதும் பாம்பின்மீதும் நடந்து, அவைகளை மிதிப்பாய் — இது சாத்தானிய வல்லமைகளை ஜெயிக்கும் அதிகாரத்தை முன்னறிவிக்கிறது.
4. **தேவன் தாமே பேசும் வாக்குத்தத்தம் (வசனங்கள் 14-16):**
   - *"அவன் என்னிடத்தில் அன்பாயிருக்கிறபடியால் அவனை விடுவிப்பேன்... அவன் என்னை நோக்கிக் கூப்பிடுவான், நான் அவனுக்கு மறுஉத்தரவு அருளிச்செய்வேன்... நீடித்த நாட்களால் அவனைத் திருப்தியாக்கி, என் இரட்சிப்பை அவனுக்குக் காண்பிப்பேன்."*

#### 3. கிறிஸ்துவில் இதன் நிறைவேறுதல் & இன்றைய பயன்பாடு:
- இயேசு கிறிஸ்துவே நமது உண்மையான அடைக்கலப் பட்டணம். சிலுவையில் அவர் சாத்தானையும் மரணத்தின் பயத்தையும் முற்றிலுமாக வென்றுவிட்டார்.
- பயமும் பீதியும் தாக்கும் வேளைகளில் இந்த சங்கீதத்தை விசுவாசத்தோடு அறிக்கை செய்யுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Psalm 91:1-16', 'Luke 4:9-12', 'Luke 10:19', 'Romans 8:31-39'],
        disclaimer: 'சங்கீதம் 91 தேவனுடைய பாதுகாப்பை அறிவிக்கிறது. விசுவாசத்தோடு மருத்துவப் பாதுகாப்பு மற்றும் சபை போதகரின் வழிகாட்டுதலையும் கைக்கொள்ளுங்கள்.'
      };
    }

    return {
      responseText: `### 🛡️ Complete Exposition of Psalm 91: The Psalm of Divine Protection

**Direct Scripture Quotation (Psalm 91:1-4, WEB):**
> *"Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the LORD, 'He is my refuge and my fortress, my God, in whom I trust.' Surely He will save you from the fowler’s snare and from the deadly pestilence. He will cover you with His feathers, and under His wings you will find refuge; His faithfulness will be your shield and rampart."*

---

#### 1. Historical & Covenant Context:
Psalm 91 stands as Scripture's supreme anthem of refuge. Traditional rabbinic commentary associates this psalm with Moses during the wilderness wanderings following Psalm 90. It answers life's unseen perils—deadly plagues, hidden snares, spiritual warfare, and sudden calamities—by pointing to the intimate shelter of God's presence.

#### 2. Key Sections & Theological Meaning:

1. **The Four Divine Names (Verses 1-2):**
   - **Elyon (Most High):** Absolute sovereign ruler over all powers.
   - **Shaddai (Almighty):** All-sufficient, bountiful provider.
   - **Yahweh (The LORD):** Faithful, promise-keeping covenant God.
   - **Elohim (My God):** Personal, intimate protector.

2. **Fearless Confidence Against Hidden Dangers (Verses 5-8):**
   - Neither the terrors of the night, nor the arrows of the day, nor nocturnal pestilence can breach God's perimeter without His sovereign permission.
   - *"A thousand may fall at your side, ten thousand at your right hand, but it will not come near you."* God's preservation is personal and unfailing.

3. **Angelic Guardianship & Authority (Verses 9-13):**
   - God commissions His holy angels to guard believers in all their ways (Hebrews 1:14). Note: When Satan misquoted verse 11-12 to tempt Jesus in the wilderness (Matthew 4:6), Jesus countered that we must never presumptuously test God.
   - *"You will tread on the lion and the cobra..."* Foretells believers' authority over spiritual forces of darkness through Christ (Luke 10:19).

4. **God’s First-Person Covenant Promise (Verses 14-16):**
   At the psalm’s climax, the Lord Himself speaks directly:
   - *"Because he loves Me, I will rescue him; I will protect him, for he acknowledges My name."*
   - *"He will call on Me, and I will answer him; I will be with him in trouble... With long life I will satisfy him and show him My salvation."*

#### 3. Christological Application for Today:
In Christ, Psalm 91 is fully realized. We are seated with Christ in heavenly places (Ephesians 2:6). Nothing—neither pandemic, distress, nor persecution—can separate us from the love of God in Christ Jesus (Romans 8:38-39).`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Psalm 91:1-16', 'Matthew 4:5-7', 'Luke 10:19', 'Romans 8:35-39', 'Hebrews 1:14'],
      disclaimer: 'Scripture affirms God’s protective covenant. Always exercise godly wisdom, practical health precautions, and pastoral counsel.'
    };
  }

  // =========================================================================
  // 2. PSALM 23 / சங்கீதம் 23
  // =========================================================================
  if (p.includes('psalm 23') || p.includes('சங்கீதம் 23') || p.includes('shepherd') || p.includes('மேய்ப்பர்')) {
    if (isTamil) {
      return {
        responseText: `### 📖 சங்கீதம் 23 விளக்கம் (நல்ல மேய்ப்பரின் பராமரிப்பு)

**வேதாகம மேற்கோள் (சங்கீதம் 23:1-4):**
> *"கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; நான் தாழ்ச்சியடையேன். அவர் புல்லுள்ள இடங்களில் என்னை மேய்த்து, அமர்ந்த தண்ணீர்கள் அண்டையில் என்னைக் கொண்டுபோய் விடுகிறார். அவர் என் ஆத்துமாவைத் தேற்றி, தம்முடைய நாமத்தினிமித்தம் என்னை நீதியின் பாதைகளில் நடத்துகிறார். நான் மரண இருளின் பள்ளத்தாக்கிலே நடந்தாலும் பொல்லாப்புக்குப் பயப்படேன்; தேவரீர் என்னோடேகூட இருக்கிறீர்; உமது கோலும் உமது தடியும் என்னைத் தேற்றும்."*

---

#### 1. வரலாற்று மற்றும் மேய்ப்பன் பின்னணி:
தாவீது அரசன் தனது வாலிப வயதில் ஆடுகளை மேய்த்த அனுபவத்தைக் கொண்டு, தேவன் தம்முடைய மக்களை எவ்வாறு ஆழமாக வழிநடத்துகிறார் என்பதை விளக்குகிறார். ஒரு ஆடு சுயமாக வழியைக் கண்டறிய முடியாது; அது முற்றிலும் மேய்ப்பனைச் சார்ந்திருக்கிறது.

#### 2. பிரதான இறையியல் உண்மைகள்:
1. **தேவனுடைய முழுமையான பராமரிப்பு:** "நான் தாழ்ச்சியடையேன்" — ஆவிக்குரிய, சரீர மற்றும் நித்திய தேவைகளை தேவன் تامین செய்கிறார்.
2. **ஆத்தும இளைப்பாறுதல்:** அமர்ந்த தண்ணீர்கள் என்பது கலக்கமில்லாத ஆத்தும சமாதானத்தைக் குறிக்கிறது.
3. **மரண இருளின் பள்ளத்தாக்கு:** மரண பள்ளத்தாக்கில் நாம் தங்குவதில்லை; அதை *"கடந்து"* செல்லுகிறோம். மேய்ப்பரின் கோல் கொடிய மிருகங்களை விரட்டவும், தடி ஆட்டை பாதுகாப்பாக வழிநடத்தவும் உதவுகிறது.
4. **பகைவருக்கு முன்பாக பந்தி:** தேவன் நம்மை ஆசீர்வதிக்கும்போது, மனித எதிர்ப்புகளினால் அதைத் தடுக்க முடியாது.

#### 3. கிறிஸ்துவில் இதன் நிறைவேறுதல்:
யோவான் 10:11-ல் இயேசு: *"நானே நல்ல மேய்ப்பன்; நல்ல மேய்ப்பன் ஆடுகளுக்காகத் தன் ஜீவனைக் கொடுக்கிறான்"* என்று கூறினார். உங்கள் பாரங்களை அவரிடம் இறக்கிவையுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Psalm 23:1-6', 'John 10:11-15', 'Philippians 4:19', 'Revelation 7:17'],
        disclaimer: 'தனிப்பட்ட ஆவிக்குரிய வழிநடத்துதலுக்காக உங்கள் சபை போதகரை அணுகவும்.'
      };
    }

    return {
      responseText: `### 📖 Understanding Psalm 23: The Good Shepherd’s Unfailing Care

**Direct Scripture Quotation (Psalm 23:1-4, WEB):**
> *"The LORD is my shepherd; I lack nothing. He makes me lie down in green pastures, He leads me beside quiet waters, He refreshes my soul. He guides me along the right paths for His name’s sake. Even though I walk through the darkest valley, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me."*

---

#### 1. Historical & Covenant Context:
David, who spent his youth shepherding flocks in the Judean hills, uses the shepherd-sheep metaphor to explain God’s covenantal tenderness. Sheep are vulnerable creatures lacking natural defense; their entire survival hinges on the vigilance, skill, and affection of their shepherd.

#### 2. Core Theological Insights:
- **"I Lack Nothing" (Jehovah Jireh):** In Christ, believers lack nothing necessary for life, godliness, and eternal salvation.
- **Soul Restoration:** *"He refreshes my soul"* denotes turning back or reviving a wandering, weary heart through divine forgiveness and grace.
- **Valleys are Transitional:** Notice: *"Even though I walk through..."* The believer walks *through* the valley of grief, sickness, or trial; we do not establish permanent residence in darkness.
- **The Table in the Presence of Enemies:** God honors and vindicates His saints even when opposition surrounds them.

#### 3. Christological Application:
In John 10:11, Jesus fulfills Psalm 23: *"I am the good shepherd. The good shepherd lays down His life for the sheep."* You are known by name, protected by grace, and escorted into eternity by Christ.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Psalm 23:1-6', 'John 10:11-16', 'Philippians 4:19', '1 Peter 2:25'],
      disclaimer: 'Scripture interpretations differ across Christian traditions. Please consult your local church pastor for personalized pastoral care.'
    };
  }

  // =========================================================================
  // 2B. PSALM 32 / சங்கீதம் 32 (Joy of Forgiveness, Maskil, Romans 4 Link)
  // =========================================================================
  const isPsalm32 = (p.includes('psalm') || p.includes('சங்கீதம்') || p.includes('ps')) &&
    (p.includes('32') || p.includes('maskil') || p.includes('மஸ்கீல்'));

  if (isPsalm32) {
    if (isTamil) {
      return {
        responseText: `### 📖 சங்கீதம் 32 முழுமையான விளக்கம்: பாவ மன்னிப்பின் பாக்கியமும் தேவ நீதியும்

**முக்கிய வேதாகம மேற்கோள் (சங்கீதம் 32:1-5):**
> *"எவனுடைய மீறுதல் மன்னிக்கப்பட்டதோ, எவனுடைய பாவம் மூடப்பட்டதோ, அவன் பாக்கியவான். கர்த்தரால் குற்றம் சுமத்தப்படாதவனும், தன் ஆவியில் கபடம் இல்லாதவனுமாயிருக்கிற மனுஷன் பாக்கியவான். நான் மவுனமாயிருந்தபோது, நித்தம் என் கதறுதலினாலே என் எலும்புகள் உலர்ந்துபோயிற்று. இரவும் பகலும் உமது கை என்மேல் பாரமாயிருந்தது; என் சாரம் உஷ்ணகாலத்து வறட்சிபோல வறண்டுபோயிற்று. [சேலா] நான் என் பாவத்தை உமக்கு மறைக்காமல், என் அக்கிரமத்தை மூடிவைக்காமல்: என் மீறுதல்களைக் கர்த்தருக்கு அறிக்கை பண்ணுவேன் என்றேன்; தேவரீர் என் பாவத்தின் தோஷத்தை மன்னித்தீர். [சேலா]"*

---

#### 1. வரலாற்று மற்றும் இலக்கியச் சூழல்:
- **ஆசிரியர்:** தாவீது அரசன்.
- **வகை:** இது **"மஸ்கீல்"** (Maskil) என்று அழைக்கப்படும் ஞானபோதனை அல்லது ஆழ்ந்த சிந்தனைக்குரிய சங்கீதம்.
- **வரலாற்றுப் பின்னணி:** தாவீது பத்சேபாளுடன் செய்த பாவத்திற்குப் பின் நாத்தான் தீர்க்கதரிசியால் கண்டிக்கப்பட்டு, **சங்கீதம் 51**-ல் அழுது கதறி மனந்திரும்பிய பின்னர், பாவமன்னிப்பின் ஆழமான தெய்வீக சமாதானத்தை அனுபவித்த தருணத்தில் இந்த சங்கீதம் பாடப்பட்டது. இது வேதாகமத்தின் 7 பாரம்பரிய மனந்திரும்புதல் சங்கீதங்களில் (Penitential Psalms) இரண்டாவதாகும்.

#### 2. மூல எபிரெய வார்த்தைகளின் இறையியல் ஆழம்:
தாவீது பாவத்தின் மூன்று நிலைகளையும், தேவ கிருபையின் மூன்று மேன்மைகளையும் 1 மற்றும் 2-ம் வசனங்களில் அடுக்குகிறார்:
1. **பாவத்தின் தன்மை:**
   - ***பேஷா (Pesha - மீறுதல்):*** தேவனுடைய உடன்படிக்கை எல்லைகளை மீறிச் செல்லும் வெளிப்படையான கலகம்.
   - ***சட்டாஹ் (Chatta'ah - பாவம்):*** தேவனுடைய பரிசுத்த இலக்கை தவறவிடுவது (missing the mark).
   - ***அவோன் (Avon - அக்கிரமம்):*** உள்ளான கோணல் புத்தி மற்றும் ஒழுக்கச் சீர்கேடு.
2. **தேவ கிருபையின் வெற்றி:**
   - ***நாசா (Nasa - மன்னிக்கப்படுதல்):*** பாரமான பாவச் சுமை ஆண்டவரால் தூக்கி அகற்றப்படுதல்.
   - ***காசா (Kasa - மூடப்படுதல்):*** தேவனுடைய இரத்தத்தினாலும் இரக்கத்தினாலும் பாவம் மூடப்பட்டு ஆக்கினைக்குத் தப்புவிக்கப்படுதல்.
   - ***லோ-யக்ஷோவ் (Lo-yachshov - குற்றம் சுமத்தப்படாமை):*** பரலோகக் கணக்கில் பாவம் வரவு வைக்கப்படாமல் முற்றிலுமாக அழிக்கப்படுதல்.

#### 3. வசன வாரியான பகுதி விளக்கம்:
- **மன்னிக்கப்பட்டவனின் பாக்கியம் (வசனங்கள் 1-2):** "பாக்கியவான்" (*அஷ்ரே*) — மனிதனின் மெய்யான பாக்கியம் ஆஸ்தியிலோ உலகப் புகழிலோ இல்லை; தேவனால் பாவம் மன்னிக்கப்பட்டு, கபடமற்ற இருதயத்தோடு வாழ்வதில்தான் இருக்கிறது.
- **பாவத்தை மறைப்பதன் வேதனை (வசனங்கள் 3-4):** பாவத்தை அறிக்கையிடாமல் மவுனமாய் இருந்தபோது, எலும்புகள் உலர்ந்துபோயின; தேவனுடைய அன்பின் சிட்சைக் கை இரவும் பகலும் பாரமாயிருந்தது.
- **அறிக்கையிடுதலின் உடனடி விடுதலை (வசனம் 5):** கபடமில்லாமல் பாவத்தைக் கர்த்தரிடம் அறிக்கை செய்த மாத்திரத்தில், தேவன் பாவத்தின் தோஷத்தை முற்றிலுமாக மன்னித்தார்.
- **தேவன் நமது மறைவிடம் (வசனங்கள் 6-7):** ஆதியாகமம் 3-ல் ஆதாம் தேவனுக்கு பயந்து மரங்களுக்குப் பின்னே மறைந்தான்; ஆனால் மன்னிக்கப்பட்ட விசுவாசியோ தேவனிடமே அடைக்கலமாக ஓடிவந்து, *"நீர் என் மறைவிடம், என்னை விடுதலையின் பாடல்களால் சூழ்ந்துகொள்ளுவீர்"* என்று துதிக்கிறான்.
- **தேவ வழிகாட்டுதலும் ஞானமும் (வசனங்கள் 8-9):** வசனம் 8-ல் கர்த்தர் தாமே வாக்களிக்கிறார்: *"நான் உனக்குப் போதித்து, நீ நடக்கவேண்டிய வழியை உனக்குக் காட்டுவேன்; என் கண்ணை உன்மேல் வைத்து உனக்கு ஆலோசனை சொல்லுவேன்."* கடிவாளம் போட்டுக் கட்டுப்படுத்த வேண்டிய குதிரை, கோவேறு கழுதையைப்போல முரட்டுத்தனமாய் இராமல், தாழ்மையோடு தேவ சத்தத்திற்குக் கீழ்ப்படிய வேண்டும்.
- **கிருபையின் பெருமகிழ்ச்சி (வசனங்கள் 10-11):** துன்மார்க்கனுக்கு வேதனைகள் அதிகம்; கர்த்தரை நம்புகிறவனையோ கிருபை (*ஹெஸெட்*) சூழ்ந்துகொள்ளும். நீதிமான்களே, கர்த்தருக்குள் களிகூர்ந்து மகிழுங்கள்!

#### 4. புதிய ஏற்பாட்டு இறையியல் இணைப்பு: ரோமர் 4:6-8
அப்போஸ்தலனாகிய பவுல் **ரோமர் 4:6-8**-ல் கிரியைகளில்லாமல் வெறும் விசுவாசத்தினாலே தேவனால் நீதிமானாக்கப்படுவதற்கு (Justification by Faith) சங்கீதம் 32:1-2 வசனங்களையே தலையாய ஆதாரமாக மேற்கோள் காட்டுகிறார்:
> *"கிரியைகளில்லாமல் தேவனாலே நீதிமான் என்று எண்ணப்படுகிற மனுஷனுடைய பாக்கியத்தைக் குறித்துத் தாவீதும் சொல்லியிருக்கிறார்: எவர்களுடைய அக்கிரமங்கள் மன்னிக்கப்பட்டதோ, எவர்களுடைய பாவங்கள் மூடப்பட்டதோ, அவர்கள் பாக்கியவான்கள். எவன் பாவத்தைக் கர்த்தர் எண்ணாதிருக்கிறாரோ, அவன் பாக்கியவான்."*

#### 5. நடைமுறைப் பிரயோகம்:
- **பாவத்தை ஒருபோதும் ஒளித்து வைக்காதீர்கள்:** 1 யோவான் 1:9 வாக்குத்தத்தம்படி ஆண்டவரிடம் உண்மையோடு அறிக்கை செய்யுங்கள்; அவர் உடனடி மன்னிப்பையும் சமாதானத்தையும் தருவார்.
- **கிறிஸ்துவின் சிலுவை நீதியைச் சார்ந்திருங்கள்:** நாம் கிரியைகளால் அல்ல, கிறிஸ்து நமக்காகப் பெற்றுத்தந்த இலவச கிருபையினால் நீதிமான்களாக்கப்பட்டிருக்கிறோம்.
- **மென்மையான இருதயத்தோடு கீழ்ப்படியுங்கள்:** கர்த்தர் தமது கண்ணை நம்மேல் வைத்து வழிநடத்த விரும்புகிறார்; பிடிவாதத்தைத் தவிர்த்து தேவனுடைய ஆவியானவருக்கு இடங்கொடுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Psalm 32:1-11', 'Psalm 51:1-17', 'Romans 4:6-8', '1 John 1:9', '2 Samuel 12:13'],
        disclaimer: 'சங்கீதம் 32-ன் போதனைகள் உங்கள் தனிப்பட்ட பக்திவிருத்திக்கும் ஜெப தியானத்திற்கும் உதவும். சபை ஐக்கியத்திலும் போதகர் ஆலோசனையிலும் நிலைத்திருங்கள்.'
      };
    }

    return {
      responseText: `### 📖 Complete Exposition of Psalm 32: The Joy of Forgiveness & Imputed Righteousness

**Direct Scripture Quotation (Psalm 32:1-5, WEB):**
> *"Blessed is he whose disobedience is forgiven, whose sin is covered. Blessed is the man whom Yahweh doesn’t charge with iniquity, in whose spirit there is no deceit. When I kept silence, my bones wasted away through my groaning all day long. For day and night Your hand was heavy on me. My strength was consumed in the heat of summer. [Selah] I acknowledged my sin to You. I didn’t hide my iniquity. I said, 'I will confess my transgressions to Yahweh,' and You forgave the iniquity of my sin. [Selah]"*

---

#### 1. Historical, Literary & Covenant Context
- **Author & Classification:** Composed by King David; designated as a **Maskil** (an instructional or wisdom-teaching psalm intended to provide contemplative insight for the community of faith).
- **Historical Background:** Psalm 32 is widely recognized as the companion and joyful theological sequel to **Psalm 51**. While Psalm 51 records David’s brokenhearted cry for mercy after the prophet Nathan confronted his adultery with Bathsheba and the murder of Uriah (2 Samuel 11–12), Psalm 32 was written after David experienced the liberating reality of God’s complete pardon and cleansing.
- **Penitential Category:** It stands as the second of the seven traditional Penitential Psalms in the Christian liturgical and devotional heritage.

#### 2. Key Hebrew Word Study: Anatomy of Sin & Grace (Verses 1–2)
David intentionally employs three distinct Hebrew legal and relational terms for human wrongdoing, and three corresponding theological terms for God’s redemptive pardon:
1. **The Three Dimensions of Guilt:**
   - ***Pesha* (Transgression):** Willful, defiant rebellion against God’s sovereign covenant boundary.
   - ***Chatta'ah* (Sin):** Missing the target; failing to live up to God’s holy standard.
   - ***Avon* (Iniquity):** Internal perversity, moral crookedness, and guilt that distorts the character.
2. **The Threefold Triumph of Divine Grace:**
   - ***Nasa* (Forgiven):** Literally "lifted up and carried away"—the crushing burden of guilt is removed.
   - ***Kasa* (Covered):** Concealed from punitive wrath under God’s own merciful atonement.
   - ***Lo-yachshov* (Not Imputed / Not Charged):** A divine accounting verdict: God does not calculate or credit the sinner's debt to their personal ledger.

#### 3. Section-by-Section Exegesis

* **The Beatitude of the Justified (vv. 1–2):**  
  David begins with a joyful exclamation: *"Blessed"* (*Ashrei*—deep, divine favor). True human happiness does not stem from external wealth or earthly honors, but from the spiritual reality that one's rebellion has been canceled and one lives before God *"with no deceit"* (absolute vulnerability and honest confession).

* **The Physical and Spiritual Agony of Concealment (vv. 3–4):**  
  David graphically recalls the period when he concealed his transgression. The heavy hand of God brought psychosomatic exhaustion: *"my bones wasted away... my strength was dried up as in summer drought."* This divine pressure was not vindictive cruelty, but loving fatherly discipline aimed at breaking David's stubborn self-justification (Hebrews 12:5–11).

* **The Turning Point of Honest Confession (v. 5):**  
  The deadlock was broken when David abandoned self-defense: *"I acknowledged my sin... I did not cover my iniquity... and You forgave the guilt of my sin."* The moment honest confession was uttered, God's absolution was immediate and absolute.

* **God as Deliverer and Hiding Place (vv. 6–7):**  
  Unlike Adam who hid *from* God in fear (Genesis 3:8–10), the forgiven believer hides *in* God: *"You are my hiding place; You will protect me from trouble and surround me with songs of deliverance."*

* **Divine Instruction vs. Animal Stubbornness (vv. 8–9):**  
  In verse 8, the Lord Himself speaks: *"I will instruct you and teach you in the way you should go; I will counsel you with My loving eye on you."* The psalmist immediately urges believers not to be like senseless beasts—the horse (prone to rash rushing) or the mule (prone to stubborn digging-in)—requiring a bit and bridle to be guided. God seeks a willing, tenderhearted pupil.

* **Steadfast Love (*Hesed*) and Exultant Joy (vv. 10–11):**  
  The psalm concludes with a dramatic contrast: while the wicked experience compounded sorrow, the one who trusts in the Lord is surrounded on every side by covenant steadfast love (*Hesed*). The righteous are called to rejoice and sing aloud.

#### 4. Canonical Cross-Reference: The Core of Romans 4:6–8
In the New Testament, the Apostle Paul quotes Psalm 32:1–2 as his chief Old Testament pillar for the doctrine of **Justification by Faith Alone (*Sola Fide*)**:
> *"David says the same thing when he speaks of the blessedness of the one to whom God credits righteousness apart from works: 'Blessed are those whose transgressions are forgiven, whose sins are covered. Blessed is the one whose sin the Lord will never count against them.'"* (Romans 4:6–8)

Paul reveals that David understood the gospel: justification is not earned through ceremonial sacrifices or moral deeds, but received when God graciously credits Christ's righteousness to the ungodly through faith.

#### 5. Practical Theological Applications for Discipleship
- **End the Futility of Concealment:** Concealed guilt robs believers of joy, clarity, and peace. 1 John 1:9 promises that *"if we confess our sins, He is faithful and just and will forgive us our sins and purify us from all unrighteousness."*
- **Rest in Imputed Righteousness:** In Christ Jesus, God never charges our sins to our account (2 Corinthians 5:19). Your identity rests on Christ's spotless record.
- **Remain Teachable Before the Spirit:** Yield to God's gentle, watchful eye rather than forcing Him to use painful corrective circumstances (the bit and bridle) to turn you back to His paths.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Psalm 32:1-11', 'Psalm 51:1-17', 'Romans 4:6-8', '2 Samuel 12:1-13', '1 John 1:8-9', '2 Corinthians 5:19-21'],
      disclaimer: 'Psalm 32 provides foundational teaching on confession, grace, and teachability. Consult your local church pastor for personal spiritual counsel and prayer.'
    };
  }

  // =========================================================================
  // 3A. ROMANS 12:1-2 / ரோமர் 12:1-2 (Living Sacrifice & Transformed Mind)
  // =========================================================================
  const isRomans12 = (p.includes('roman') || p.includes('ரோமர்')) &&
    (p.includes('12') || p.includes('sacrifice') || p.includes('renew') || p.includes('பலி') || p.includes('மறுரூப'));

  if (isRomans12) {
    if (isTamil) {
      return {
        responseText: `### 📖 ரோமர் 12:1-2 விளக்கம் (ஜீவபலியும் மறுரூபமான மனமும்)

**முக்கிய வேதாகம மேற்கோள் (ரோமர் 12:1-2):**
> *"அப்படியிருக்க, சகோதரரே, நீங்கள் உங்கள் சரீரங்களைப் பரிசுத்தமும் தேவனுக்குப் பிரியமுமான ஜீவபலியாக ஒப்புக்கொடுக்கவேண்டுமென்று, தேவனுடைய இரக்கங்களை முன்னிட்டு உங்களை வேண்டிக்கொள்ளுகிறேன்; இதுவே நீங்கள் செய்யத்தக்க புத்தியுள்ள ஆராதனை. நீங்கள் இந்த பிரபஞ்சத்திற்கு ஒத்த வேஷந்தரியாமல், தேவனுடைய நன்மையும் பிரியமும் பரிபூரணமுமான சித்தம் இன்னதென்று பகுத்தறியத்தக்கதாக, உங்கள் மனம் புதிதாகிறதினாலே மறுரூபமாகுங்கள்."*

---

#### 1. வரலாற்று மற்றும் இறையியல் பின்னணி:
ரோமர் 1 முதல் 11 அதிகாரங்கள் வரை அப்போஸ்தலனாகிய பவுல் தேவனுடைய அளவிட முடியாத கிருபை, நீதிமானாக்குதல், மற்றும் மீட்பின் இரக்கங்களை விரிவாக விளக்குகிறார். 12-ம் அதிகாரத்தின் துவக்கத்தில் *"அப்படியிருக்க... தேவனுடைய இரக்கங்களை முன்னிட்டு"* என்று தொடங்கி, நாம் பெற்ற இந்த மாபெரும் இரட்சிப்புக்கு நமது வாழ்க்கையே நன்றியறிதலின் பலியாக மாற வேண்டும் என்று அறைகூவல் விடுக்கிறார்.

#### 2. பிரதான இறையியல் தூண்கள்:
1. **சரீரங்களை ஜீவபலியாக ஒப்புக்கொடுத்தல் (வசனம் 1):**
   - பழைய ஏற்பாட்டில் மிருகங்கள் கொல்லப்பட்டு பலிபீடத்தில் வைக்கப்பட்டன (செத்த பலி).
   - புதிய ஏற்பாட்டில், கிறிஸ்து நமக்காக மரித்துவிட்டபடியால், நாம் தேவனுக்காக அன்றாடம் வாழுவதே **"ஜீவபலி"** (Living Sacrifice). நமது கண்கள், கைகள், சிந்தனை மற்றும் முழு சரீரமும் தேவனுடைய பரிசுத்தத்திற்கு அர்ப்பணிக்கப்பட வேண்டும்.
2. **புத்தியுள்ள ஆராதனை (Logike Latreia):**
   - ஆராதனை என்பது ஞாயிற்றுக்கிழமை பாடும் பாடல்களோடு முடிந்துவிடுவதல்ல; நமது அன்றாடக் கீழ்ப்படிதலும், தூய்மையான வாழ்க்கையுமே உண்மையான ஆவிக்குரிய ஆராதனையாகும்.
3. **பிரபஞ்சத்திற்கு ஒத்த வேஷந்தரியாதிருங்கள் (வசனம் 2):**
   - உலகத்தின் பாவ முறைகள், சுயநலம் மற்றும் பெருமையின் வார்ப்புக்குள் நாம் சிக்கிவிடக்கூடாது.
4. **மனம் புதிதாகிறதினாலே மறுரூபமாகுதல் (Metamorphosis):**
   - *"மறுரூபம்"* என்ற கிரேக்கச் சொல் (Metamorphoo) புழு வண்ணத்துப் பூச்சியாக மாறுவது போன்ற உட்புற மாற்றத்தைக் குறிக்கிறது. தேவனுடைய வார்த்தையைத் தியானிப்பதன் மூலம் பரிசுத்த ஆவியானவர் நமது மனதை மறுரூபப்படுத்துகிறார்.
5. **தேவனுடைய சித்தத்தைப் பகுத்தறிதல்:**
   - மனம் புதிதாகும்போது, தேவனுடைய சித்தம் எவ்வளவு நன்மையும், பிரியமும், பரிபூரணமுமானது என்பதை நம்மால் ருசித்து அறிய முடியும்.

#### 3. இன்றைய நடைமுறைப் பிரயோகம்:
- ஒவ்வொரு நாளும் காலையில்: *"ஆண்டவரே, என் சரீரத்தையும் சிந்தையையும் உமக்கு ஜீவபலியாகத் தருகிறேன்"* என்று அர்ப்பணியுங்கள்.
- உலகப் போக்குகளிலிருந்து உங்கள் கண்களையும் எண்ணங்களையும் தேவ வசனத்தைக் கொண்டு காத்துக் கொள்ளுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Romans 12:1-2', 'Romans 12:3-21', 'Colossians 3:1-10', 'Ephesians 4:22-24', '1 Peter 2:5'],
        disclaimer: 'ரோமர் 12 உங்கள் அர்ப்பணிப்பு வாழ்க்கையை வலுப்படுத்த உதவுகிறது. மேலதிக ஆவிக்குரிய ஆலோசனைகளுக்கு உங்கள் சபை போதகரை அணுகவும்.'
      };
    }

    return {
      responseText: `### 📖 Romans 12:1-2: Living Sacrifice & Transformed Living

**Direct Scripture Quotation (Romans 12:1-2, WEB):**
> *"Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don’t be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God."*

---

#### 1. Literary & Covenant Context:
In Romans chapters 1 through 11, the Apostle Paul expounded the depths of the Gospel—justification by faith alone, redemption in Christ, life in the Holy Spirit, and God's sovereign covenantal faithfulness. 
With the opening word of Chapter 12—*"Therefore"*—Paul pivots from **theology to doxological practice**. Because of the overwhelming "mercies of God" revealed in the cross, our entire lifestyle becomes an offering of praise.

#### 2. Key Pillars of Romans 12:1-2:

1. **A "Living Sacrifice" (*Thysian Zosan*):**
   - In the Old Covenant, animal sacrifices were slain on the altar (dead sacrifices).
   - In the New Covenant, because Christ died once for all (Hebrews 10:10), believers offer their ongoing bodily existence as an active, daily, consecrated offering to God.
   - Every faculty—our speech, time, sexuality, work, and finances—is consecrated to God’s holy purpose.

2. **Your True and Proper Worship (*Logike Latreia*):**
   - Worship is not confined to church buildings or songs; biblical worship is the reasonable, spiritual allegiance of one's entire life to the King of kings.

3. **"Do Not Conform" (*Schema*):**
   - The Greek implies: *"Stop letting the surrounding worldly culture squeeze you into its mold."* The fleeting patterns of secular cynicism, materialism, and pride must not dictate our choices.

4. **"Be Transformed by the Renewing of Your Mind" (*Metamorphoo*):**
   - Transformation is inward, wrought by the Holy Spirit as Scripture reshapes our thought patterns (the root of *metamorphosis*, like a caterpillar turning into a butterfly).
   - We do not reform ourselves by mere willpower; we are transformed by immersing our minds in God's eternal truth.

5. **Discerning God's Will:**
   - A renewed mind gains spiritual discernment to test, recognize, and embrace God's will, which is good, pleasing, and complete.

#### 3. Practical Application for Today:
- **Morning Consecration:** Begin each morning presenting your eyes, hands, words, and thoughts to Christ as His instruments.
- **Media & Thought Filter:** Guard against worldly conformity by filtering media, entertainment, and habits through Philippians 4:8.
- **Active Church Service:** Romans 12 continues in verses 3-8 by calling every believer to employ their spiritual gifts within the body of Christ.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Romans 12:1-2', 'Romans 12:3-8', 'Ephesians 4:22-24', 'Colossians 3:1-10', 'Hebrews 10:10'],
      disclaimer: 'Romans 12 teaches holistic Christian devotion. For practical discipleship and ministry engagement, consult your local church leadership.'
    };
  }

  // =========================================================================
  // 3B. ROMANS 8 / ரோமர் 8 (Life in the Spirit & Eternal Security)
  // =========================================================================
  const isRomans8 = (p.includes('roman') || p.includes('ரோமர்')) &&
    (p.includes('8') || p.includes('condemnation') || p.includes('separation') || p.includes('ஆக்கினைத்தீர்ப்பு') || p.includes('சுவிகாரம்') || p.includes('conqueror'));

  if (isRomans8) {
    if (isTamil) {
      return {
        responseText: `### 📖 ரோமர் 8 விளக்கம் (ஆவியின் ஜீவனும் தேவ அன்பின் வெற்றியும்)

**முக்கிய வேதாகம மேற்கோள்கள்:**
> *"ஆனபடியால், கிறிஸ்து இயேசுவுக்குட்பட்டவர்களாயிருந்து, மாம்சத்தின்படி நடவாமல் ஆவியின்படியே நடக்கிறவர்களுக்கு ஆக்கினைத்தீர்ப்பில்லை."* — **ரோமர் 8:1**
> *"அன்றியும், தேவனிடத்தில் அன்புகூருகிறவர்களாய், அவருடைய தீர்மானத்தின்படி அழைக்கப்பட்டவர்களாயிருக்கிறவர்களுக்குச் சகலமும் நன்மைக்கு ஏதுவாக நடக்கிறது என்று அறிந்திருக்கிறோம்."* — **ரோமர் 8:28**

---

#### 1. இறையியல் பின்னணி:
ரோமர் 8 புதிய ஏற்பாட்டின் மிக உன்னதமான அதிகாரங்களில் ஒன்றாகும். இது பரிசுத்த ஆவியானவரின் வல்லமையால் நாம் பாவத்தின் பிடியிலிருந்து விடுபட்டு, தேவனுடைய சொந்தப் பிள்ளைகளாக சுவிகாரிக்கப்படுவதை விவரிக்கிறது.

#### 2. பிரதான போதனைகள்:
1. **ஆக்கினைத்தீர்ப்பு இல்லை (வசனம் 1):** கிறிஸ்து சிலுவையில் நம்முடைய பாவ தண்டனையை சுமந்து தீர்த்ததால், விசுவாசிக்கு இனி தண்டனைத் தீர்ப்பு இல்லை.
2. **அப்பா பிதாவே என்ற சுவிகாரம் (வசனம் 15-17):** நாம் அடிமைத்தனத்தின் ஆவியைப் பெறாமல், புத்திரசுவிகாரத்தின் ஆவியைப் பெற்றிருக்கிறோம்; நாம் தேவனுடைய சுதந்திரரும், கிறிஸ்துவுக்கு உடன்பங்காளருமாய் இருக்கிறோம்.
3. **சகலமும் நன்மைக்கு ஏதுவான தேவ திட்டம் (வசனம் 28):** உபத்திரவங்கள், தாமதங்கள் மற்றும் சோதனைகளின் மத்தியிலும் தேவன் தம்முடைய நித்திய நோக்கத்தை நிறைவேற்றுகிறார்.
4. **தேவ அன்பிலிருந்து பிரிக்க முடியாத வெற்றி (வசனம் 35-39):** மரணமானாலும், ஜீவனானாலும், நிகழ்காரியங்களானாலும், வரும் காரியங்களானாலும் நம்முடைய கர்த்தராகிய கிறிஸ்து இயேசுவிலுள்ள தேவ அன்பைவிட்டு நம்மைப் பிரிக்கமாட்டாது.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Romans 8:1', 'Romans 8:14-17', 'Romans 8:28', 'Romans 8:31-39'],
        disclaimer: 'வேதாகம ஆலோசனைகளுக்காக உங்கள் சபை போதகரை அணுகவும்.'
      };
    }

    return {
      responseText: `### 📖 Romans 8: Life in the Spirit & Eternal Security in Christ

**Key Scripture Quotations (WEB):**
> *"Therefore, there is now no condemnation for those who are in Christ Jesus."* — **Romans 8:1**
> *"And we know that in all things God works for the good of those who love Him, who have been called according to His purpose."* — **Romans 8:28**

---

#### 1. Theological Framework:
Romans 8 is often described as the Everest of the New Testament. Apostle Paul takes believers from "no condemnation" at the start (verse 1) to "no separation" at the conclusion (verse 39).

#### 2. Core Pillars of Romans 8:
- **Justification Realized (Verse 1):** The Greek word *katakrima* (judicial penalty) is wiped clean by the blood of Christ.
- **Adoption as Sons (Verses 14-17):** Believers do not receive a spirit of fear, but the Spirit of adoption, crying *"Abba, Father!"* We are co-heirs with Christ.
- **Sovereign Providence (Verse 28):** God does not say all things *are* good, but that He sovereignly *works* all things together for ultimate spiritual good and conformity to Christ (verse 29).
- **More Than Conquerors (Verses 37-39):** Tribulation, distress, peril, or sword cannot sever the believer from God's eternal grip.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Romans 8:1-2', 'Romans 8:14-17', 'Romans 8:28-30', 'Romans 8:37-39'],
      disclaimer: 'For deeper theological study and pastoral counseling, consult your local church leadership.'
    };
  }

  // =========================================================================
  // 3C. ROMANS 4 / ரோமர் 4 (Justification by Faith, Abraham, David & Psalm 32)
  // =========================================================================
  const isRomans4 = (p.includes('roman') || p.includes('ரோமர்') || p.includes('rom')) &&
    (p.includes('4') || p.includes('abraham') || p.includes('ஆபிரகாம்') || p.includes('credited as righteousness') || p.includes('நீதியாக எண்ணப்பட்டது')) &&
    !p.includes('12') && !p.includes('8') && !p.includes('14');

  if (isRomans4) {
    if (isTamil) {
      return {
        responseText: `### 📖 ரோமர் 4 முழுமையான விளக்கம்: விசுவாசத்தினால் மட்டுமே நீதிமானாக்கப்படுதல்

**முக்கிய வேதாகம மேற்கோள் (ரோமர் 4:1-8):**
> *"அப்படியானால் நம்முடைய தகப்பனாகிய ஆபிரகாம் சரீரத்தின்படி என்னத்தைக் கண்டுகொண்டான் என்று சொல்லுவோம்? ஆபிரகாம் கிரியைகளினாலே நீதிமானாக்கப்பட்டிருந்தால், மேன்மைபாராட்ட அவனுக்கு இடமுண்டு; ஆகிலும் தேவனுக்கு முன்பாக மேன்மைபாராட்ட இடமில்லை. வேதவாக்கியம் என்ன சொல்லுகிறது? ஆபிரகாம் தேவனை விசுவாசித்தான், அது அவனுக்கு நீதியாக எண்ணப்பட்டது என்று சொல்லுகிறது. கிரியை செய்கிறவனுக்குக் கூலி கிருபையென்றெண்ணப்படாமல், கடனென்றெண்ணப்படும். ஒருவன் கிரியை செய்யாமல், பக்தியற்றவனை நீதிமானாக்குகிறவரிடத்தில் விசுவாசம் வைக்கிறவனாயிருந்தால், அவனுடைய விசுவாசமே அவனுக்கு நீதியாக எண்ணப்படும். கிரியைகளில்லாமல் தேவனாலே நீதிமான் என்று எண்ணப்படுகிற மனுஷனுடைய பாக்கியத்தைக் குறித்துத் தாவீதும் சொல்லியிருக்கிறார்: எவர்களுடைய அக்கிரமங்கள் மன்னிக்கப்பட்டதோ, எவர்களுடைய பாவங்கள் மூடப்பட்டதோ, அவர்கள் பாக்கியவான்கள். எவன் பாவத்தைக் கர்த்தர் எண்ணாதிருக்கிறாரோ, அவன் பாக்கியவான்."*

---

#### 1. வரலாற்று மற்றும் இலக்கியச் சூழல்:
- **ரோமர் நிருபத்தில் இதன் இடம்:** ரோமர் 1 முதல் 3 வரை புறஜாதிகள், யூதர்கள் அனைவரும் பாவத்திற்குட்பட்டு தேவனுடைய மகிமையை இழந்திருக்கிறார்கள் (ரோமர் 3:23) என்று பவுல் நிரூபித்த பிறகு, தேவனுடைய நீதி கிறிஸ்து இயேசுவின் மூலமாய் விசுவாசத்தினால் இலவசமாகக் கிடைக்கிறது என்று பிரகடனம் செய்தார்.
- **ரோமர் 4-ன் இறையியல் மையம்:** யூத விசுவாசிக்கு எழும் கேள்வி: *"இஸ்ரவேலின் பிதாவாகிய ஆபிரகாமும், மகத்தான அரசனாகிய தாவீதும் எவ்வாறு இரட்சிக்கப்பட்டார்கள்?"* இதற்குப் பதிலாக, புதிய ஏற்பாட்டின் கிருபையின் சுவிசேஷம் பழைய ஏற்பாட்டிற்கும் முரணானது அல்ல; ஆபிரகாமும் தாவீதும் நற்கிரியைகளினாலோ சடங்காச்சாரங்களினாலோ அல்ல, விசுவாசத்தினால் மட்டுமே நீதிமானாக்கப்பட்டார்கள் என்பதை பவுல் நிரூபிக்கிறார்.

#### 2. பிரதான இறையியல் தூண்கள்:
1. **ஆபிரகாம் விசுவாசத்தினால் நீதிமானாக்கப்பட்டான் (வசனங்கள் 1-5):**
   - பவுல் **ஆதியாகமம் 15:6**-ஐ மேற்கோள் காட்டுகிறார்: *"ஆபிரகாம் தேவனை விசுவாசித்தான், அது அவனுக்கு நீதியாக எண்ணப்பட்டது."*
   - ஒருவன் வேலை செய்து கூலி வாங்கினால், அது அவனுக்குரிய சம்பளமே (கடனே) தவிர கிருபையல்ல. ஆனால், கிரியைகள் அற்ற பாவிகளை தேவனிடம் சேர்க்கும் விசுவாசமே நீதியாக வரவு வைக்கப்படுகிறது (இலவசக் கொடை).
2. **தாவீதின் சங்கீதம் 32 சாட்சி (வசனங்கள் 6-8):**
   - ஆபிரகாமுக்கு அடுத்தபடியாக இஸ்ரவேலின் தலையாய ஆவிக்குரிய தலைவரான தாவீதின் **சங்கீதம் 32:1-2**-ஐ பவுல் மேற்கோள் காட்டுகிறார்: *"எவர்களுடைய அக்கிரமங்கள் மன்னிக்கப்பட்டதோ... எவன் பாவத்தைக் கர்த்தர் எண்ணாதிருக்கிறாரோ, அவன் பாக்கியவான்."*
   - கிரியைகள் இல்லாமல் தேவன் ஒருவனுக்கு நீதியை வரவு வைக்கிறார் என்பதை தாவீது தன் சொந்த பாவமன்னிப்பு அனுபவத்திலிருந்து பாடியிருக்கிறார்.
3. **விருத்தசேதனத்திற்கு முந்தின விசுவாசம் (வசனங்கள் 9-12):**
   - ஆபிரகாம் எப்போது நீதிமானாக்கப்பட்டார்? ஆதியாகமம் 15-ல், அவர் விருத்தசேதனம் பெறுவதற்கு குறைந்தது 14 ஆண்டுகளுக்கு முன்பாகவே!
   - எனவே, விருத்தசேதனம் நீதியைத் தரவில்லை; ஏற்கனவே விசுவாசத்தினால் பெற்ற நீதிக்கு அது வெளிப்புற அடையாளமாகவும் முத்திரையாகவும் மட்டுமே விளங்கியது. இதன்மூலம் விருத்தசேதனம் இல்லாத புறஜாதியாருக்கும், விசுவாசிக்கும் யூதருக்கும் ஆபிரகாம் விசுவாசத்தின் தகப்பனாகிறார்.
4. **உயிர்ப்பிக்கும் விசுவாசம் (வசனங்கள் 18-25):**
   - நூறு வயதுடைய தன் சரீரம் செத்துப்போன நிலைமையையும், சாராளுடைய கர்ப்பம் செத்துப்போன நிலைமையையும் எண்ணாமல், ஆபிரகாம் நம்பிக்கைக்கு விரோதமான நம்பிக்கையோடு தேவனுடைய வாக்குத்தத்தங்களை விசுவாசித்தான்.
   - வசனங்கள் 24-25: இது நமக்காகவும் எழுதப்பட்டது: இயேசு நம்முடைய பாவங்களுக்காக சிலுவை மரணத்திற்கு ஒப்புக்கொடுக்கப்பட்டும், நாம் நீதிமான்களாக்கப்படுவதற்காக உயிர்த்தெழுப்பப்பட்டார்.

#### 3. வேதாகம இணைப்பு (Canonical Connections):
- **ஆதியாகமம் 15:6 & 17:1-14:** ஆபிரகாமின் உடன்படிக்கை விசுவாசம் மற்றும் விருத்தசேதனம்.
- **சங்கீதம் 32:1-2:** தாவீதின் பாவமன்னிப்பின் பாக்கியமும், நீதிமான் என்று எண்ணப்படுதலும்.
- **ஆபகூக் 2:4 & கலாத்தியர் 3:6-14:** விசுவாசத்தினாலே நீதிமான் பிழைப்பான்.
- **யாக்கோபு 2:21-24:** மெய்யான ஜீவனுள்ள விசுவாசம் கீழ்ப்படிதலினால் வெளிப்படுகிறது என்ற ஒருங்கிணைந்த பார்வை.

#### 4. நடைமுறைப் பிரயோகம்:
- **சுயநீதியை உதறித்தள்ளுங்கள்:** நாம் செய்யும் ஜெபங்களோ, தர்மங்களோ அல்லது ஒழுக்கக் கிரியைகளோ நம்மை தேவனுக்கு முன்பாக நீதிமானாக்க முடியாது. கிறிஸ்துவின் பூரண நீதியே நமது ஒரே நம்பிக்கை.
- **அசாத்திய சூழ்நிலைகளில் தேவனை நம்புங்கள்:** உங்கள் குடும்பத்திலோ, சரீரத்திலோ, எதிர்காலத்திலோ எல்லாமே முடிந்துவிட்டது போன்ற சூழ்நிலைகள் இருந்தாலும், மரித்தவைகளை உயிர்ப்பிக்கும் தேவனுடைய வாக்குத்தத்தங்களை விசுவாசியுங்கள்.
- **உயிர்த்தெழுதலின் சமாதானத்தில் வாழுங்கள்:** இயேசு உங்கள் பாவங்களுக்காக மரித்து, உங்கள் நீதிக்காக உயிர்த்தெழுந்துவிட்டதால், குற்ற உணர்விலிருந்து விடுதலை பெற்று தேவனைத் துதியுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Romans 4:1-25', 'Genesis 15:6', 'Psalm 32:1-2', 'Romans 3:21-28', 'Romans 5:1', 'Galatians 3:6-9'],
        disclaimer: 'ரோமர் 4 சுவிசேஷத்தின் அடிப்படை அடித்தளத்தை விளக்குகிறது. மேலதிக திருச்சபைப் படிப்புகளுக்கு உங்கள் சபை போதகரை அணுகவும்.'
      };
    }

    return {
      responseText: `### 📖 Complete Exposition of Romans 4: Justification by Faith Alone Through Grace

**Direct Scripture Quotation (Romans 4:1-8, WEB):**
> *"What then will we say that Abraham, our forefather, has found according to the flesh? For if Abraham was justified by works, he has something to boast about, but not toward God. For what does the Scripture say? 'Abraham believed God, and it was accounted to him for righteousness.' Now to him who works, the reward is not counted as grace, but as something owed. But to him who doesn’t work, but believes in Him who justifies the ungodly, his faith is credited as righteousness. Just as David also pronounces blessing on the man to whom God counts righteousness apart from works: 'Blessed are they whose iniquities are forgiven, whose sins are covered. Blessed is the man whom the Lord will by no means charge with sin.'"*

---

#### 1. Historical, Theological & Literary Context
- **Context within Romans:** In Romans 1:18–3:20, Paul built an ironclad case that the entire human race—Gentiles and Jews alike—is trapped under sin and incapable of self-justification before a holy God (Romans 3:23). In Romans 3:21–31, he unveiled God's righteousness revealed apart from the Law through faith in Jesus Christ.
- **The Central Question of Romans 4:** Paul anticipates a sharp objection from Jewish contemporaries: *"What about Abraham, our revered covenant patriarch? Was he not justified by his obedience, circumcision, and outstanding moral works?"*
- **Paul's Exegetical Strategy:** Paul turns directly to the Hebrew Scriptures (the Torah and the Psalms) to demonstrate that the Gospel of Justification by Faith (*Sola Fide*) is not a novel invention, but the very way God has always redeemed sinners.

#### 2. Section-by-Section Exegesis

1. **Abraham Justified by Faith, Not Works (vv. 1–5):**
   - Paul cites **Genesis 15:6**: *"Abraham believed God, and it was credited to him as righteousness."*
   - Paul uses legal and commercial bookkeeping terminology (*logizomai* — to credit, calculate, or reckon). If righteousness were earned through deeds, the reward would be an obligatory paycheck of debt (*opheilema*), not a gift of unmerited grace (*charis*). 
   - Verse 5 contains one of the most stunning declarations in Scripture: God *"justifies the ungodly."* God does not wait for sinners to reform themselves before declaring them righteous; He credits righteousness to the ungodly the moment they trust in Christ.

2. **David's Testimony from Psalm 32 (vv. 6–8):**
   - Alongside Abraham (the father of the covenant), Paul brings forward King David (Israel's premier king and sweet psalmist) as a second Old Testament witness.
   - Quoting **Psalm 32:1–2**, Paul highlights David's celebration of imputed righteousness without works: *"Blessed are those whose transgressions are forgiven... Blessed is the one whose sin the Lord will never count against them."*
   - David, guilty of adultery and murder, could never have survived on the basis of works; his sole hope was God's merciful non-imputation of sin and positive imputation of righteousness.

3. **Justification Prior to Circumcision (vv. 9–12):**
   - Paul asks a crucial chronological question: Was Abraham declared righteous before or after his circumcision?
   - The biblical timeline in Genesis proves Abraham was justified in Genesis 15—at least 14 years *before* he received circumcision in Genesis 17!
   - Circumcision was therefore a outward sign and seal of the righteousness he already possessed by faith. This makes Abraham the spiritual father of all believers: both uncircumcised Gentile believers and circumcised Jewish believers who walk in the footsteps of his faith.

4. **The Promise Inherited by Grace Through Faith (vv. 13–17):**
   - The covenant promise that Abraham would be heir of the world did not come through the Law (which only exposes transgression and incurs wrath), but through faith, guaranteeing it to all his offspring by grace.

5. **The Quality of Abraham's Resurrection Faith (vv. 18–25):**
   - Faced with human impossibility—his own body as good as dead at age 100, and Sarah’s womb barren—Abraham *"against all hope, in hope believed."* He did not waver through unbelief, being fully persuaded that God had power to do what He promised.
   - Paul's triumphant conclusion (vv. 23–25): This was written not for Abraham alone, but for us who believe in God who raised Jesus our Lord from the dead, who *"was delivered over to death for our offenses and was raised to life for our justification."*

#### 3. Canonical Cross-References
- **Genesis 15:6 & Genesis 17:1–14:** The original covenant promise and subsequent sign of circumcision.
- **Psalm 32:1–2:** David’s joyful realization of non-imputed sin and covered transgression.
- **Habakkuk 2:4 & Galatians 3:6–14:** The continuous biblical principle that *"the righteous shall live by faith."*
- **James 2:20–24:** The complementary canonical perspective: Paul addresses the *root* of justification before God (faith alone), while James addresses the *fruit* of justification before people (faith evidenced by works).

#### 4. Practical Theological Application for Everyday Faith
- **Abandon Self-Righteous Boasting:** Salvation cannot be purchased by religious rituals, church heritage, or moral achievements. Come to God with empty hands to receive Christ’s imputed righteousness.
- **Rest in Total Forgiveness:** Because God placed your sins on Christ at the cross, He will never charge them against your account (Romans 8:1). Live in the joy of Psalm 32.
- **Trust God's Promises in Dry Valleys:** When medical reports, financial hurdles, or family crises seem insurmountable, imitate Abraham: believe God's Word over visible deadness, for our God gives life to the dead and calls into being things that were not.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Romans 4:1-25', 'Genesis 15:6', 'Psalm 32:1-2', 'Romans 3:21-26', 'Romans 5:1-2', 'Galatians 3:6-14', '2 Corinthians 5:21'],
      disclaimer: 'Romans 4 establishes the theological core of the Gospel. For personalized discipleship and theological discussions, connect with your church pastoral team.'
    };
  }

  // =========================================================================
  // 4. JOHN 3:16 & SALVATION / யோவான் 3:16 & இரட்சிப்பு
  // =========================================================================
  if (p.includes('john 3') || p.includes('யோவான் 3') || p.includes('salvation') || p.includes('இரட்சிப்பு') || p.includes('born again')) {
    if (isTamil) {
      return {
        responseText: `### ✝️ யோவான் 3:16 & வேதாகம இரட்சிப்பின் செய்தி

**வேதாகம மேற்கோள் (யோவான் 3:16):**
> *"தேவன், தம்முடைய ஒரேபேறான குமாரனை விசுவாசிக்கிற எவனும் கெட்டுப்போகாமல் நித்தியஜீவனை அடையும்படிக்கு, அவரைத் தந்தருளி, இவ்வளவாய் உலகத்தில் அன்புகூர்ந்தார்."*

---

#### 1. வரலாற்றுச் சூழல்:
பரிசேயனும் யூதர்களின் அதிகாரியுமான நிக்கோதேமு இரவில் இயேசுவிடம் வந்தபோது, இயேசு அவரிடம் மறுபிறப்பைக் குறித்தும் (ஆவியினாலும் தண்ணீரினாலும் பிறப்பது), தேவனுடைய இணையற்ற அன்பைக் குறித்தும் போதித்தார்.

#### 2. யோவான் 3:16-ன் 4 தெய்வீக தூண்கள்:
1. **தேவனுடைய அளவிட முடியாத அன்பு:** தேவன் உலகத்தில் அன்புகூர்ந்தார் — மனிதனின் தகுதியைப் பார்த்து அல்ல, தமது சொந்த கிருபையினால்.
2. **மகத்தான தியாகம்:** தமது ஒரேபேறான குமாரனாகிய இயேசுவை சிலுவை மரணத்திற்குத் தந்தார்.
3. **எளிய நிபந்தனை:** விசுவாசிக்கிற எவனும் — இரட்சிப்பு என்பது கிரியைகளினால் அல்ல, விசுவாசத்தினால் இலவசமாகப் பெறப்படும் ஈவு (எபேசியர் 2:8-9).
4. **நித்திய வாக்குத்தத்தம்:** கெட்டுப்போகாமல் நித்திய ஜீவனை அடைவான்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['John 3:1-21', 'Ephesians 2:8-9', 'Romans 10:9-10'],
        disclaimer: 'ஞானஸ்நானம் மற்றும் சபை உறுப்பினர் ஐக்கியத்திற்கு உங்கள் சபை போதகரை அணுகவும்.'
      };
    }

    return {
      responseText: `### ✝️ John 3:16 & The Heart of the Gospel

**Direct Scripture Quotation (John 3:16, WEB):**
> *"For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life."*

---

#### 1. Context:
Jesus is conversing with Nicodemus, a respected Pharisee and teacher of Israel. Jesus explains that entering God’s Kingdom requires spiritual rebirth ("born of water and the Spirit").

#### 2. The Four Pillars of John 3:16:
- **The Motive:** *"God so loved the world"* — Unconditional agape love initiating reconciliation toward sinners.
- **The Measure:** *"He gave His only begotten Son"* — The cross as the definitive proof of sacrificial grace.
- **The Means:** *"Whoever believes in Him"* — Faith alone in Christ alone, without human merit (Ephesians 2:8-9).
- **The Marvel:** *"Shall not perish but have eternal life"* — Rescue from eternal separation and entrance into everlasting communion with God.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['John 3:1-21', 'Romans 5:8', 'Ephesians 2:8-9'],
      disclaimer: 'For baptism preparation and church membership, consult your church pastoral leadership.'
    };
  }

  // =========================================================================
  // 5. FORGIVENESS / மன்னிப்பு
  // =========================================================================
  if (p.includes('forgiv') || p.includes('மன்னி') || p.includes('reconcil')) {
    if (isTamil) {
      return {
        responseText: `### 🕊️ மன்னிப்பைக் குறித்து வேதாகமம் என்ன கற்பிக்கிறது?

**முக்கிய வேதாகம மேற்கோள் (எபேசியர் 4:32):**
> *"ஒருவருக்கொருவர் தயவாயும் மனதுருக்கமாயும் இருந்து, கிறிஸ்துவுக்குள் தேவன் உங்களுக்கு மன்னித்ததுபோல, நீங்களும் ஒருவருக்கொருவர் மன்னியுங்கள்."*

---

#### 1. வேதாகமப் போதனை:
1. **கிறிஸ்துவின் மன்னிப்பே அடிப்படை:** கொலோசெயர் 3:13 கூறுகிறது: *"ஒருவருக்கொருவர் பொறுத்து, ஒருவர்பேரில் ஒருவருக்குக் குறைபாடு இருந்தால், கிறிஸ்து உங்களுக்கு மன்னித்ததுபோல, நீங்களும் ஒருவருக்கொருவர் மன்னியுங்கள்."*
2. **மன்னிப்பின் எல்லையற்ற தன்மை:** பேதுரு கேட்ட 7 முறைக்கு பதிலாக, இயேசு 70 மடங்கு 7 முறை (மத்தேயு 18:22) என்று பதிலளித்தார்.
3. **மன்னிப்பும் சமாதானமும்:** பழிவாங்குவதை தேவனிடம் விட்டுவிட்டு, இதயத்தில் கசப்பு வேர் உண்டாகாமல் காப்பதே மன்னிப்பு.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Ephesians 4:32', 'Colossians 3:13', 'Matthew 18:21-35', '1 John 1:9'],
        disclaimer: 'குடும்ப மற்றும் உறவு ரீதியான ஆழமான காயங்களுக்கு உங்கள் சபை போதகரிடமும் ஆலோசகர்களிடமும் ஆலோசனை பெறவும்.'
      };
    }

    return {
      responseText: `### 🕊️ What Does the Bible Teach About Forgiveness?

**Direct Scripture Quotation (Ephesians 4:32, WEB):**
> *"Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you."*

---

#### 1. Foundational Biblical Principles:
- **Grounded in Christ’s Atonement:** We forgive others not because they deserve it, but because Christ canceled our debt on the cross (Colossians 2:13-14).
- **Seventy Times Seven:** Jesus taught that forgiveness is an enduring attitude, not a calculated number (Matthew 18:21-22).
- **Distinguishing Forgiveness from Reconciliation:** Forgiveness releases vengeance to God (Romans 12:19); reconciliation requires demonstrated repentance and wise boundaries.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Ephesians 4:32', 'Colossians 3:12-14', 'Matthew 18:21-35', 'Romans 12:19'],
      disclaimer: 'For complex relational hurt or trauma, please reach out to trusted pastors and Christian counselors.'
    };
  }

  // =========================================================================
  // 6. ANXIETY, HOPE & PEACE / கவலை, சமாதானம்
  // =========================================================================
  if (p.includes('anxiety') || p.includes('anxious') || p.includes('hope') || p.includes('worry') || p.includes('fear') || p.includes('கவலை') || p.includes('பயம்') || p.includes('நம்பிக்கை') || p.includes('சமாதானம்')) {
    if (isTamil) {
      return {
        responseText: `### 🌿 கவலை, பயம் மற்றும் நம்பிக்கை குறித்த வேதாகம வாக்குத்தத்தங்கள்

**முக்கிய வேத வசனங்கள்:**
> *"நீங்கள் ஒன்றுக்குங் கவலைப்படாமல், எல்லாவற்றையுங்குறித்து உங்கள் விண்ணப்பங்களை ஸ்தோத்திரத்தோடே கூடிய ஜெபத்தினாலும் வேண்டுதலினாலும் தேவனுக்குத் தெரியப்படுத்துங்கள். அப்பொழுது, எல்லாப் புத்திக்கும் மேலான தேவ சமாதானம் உங்கள் இருதயங்களையும் உங்கள் சிந்தைகளையும் கிறிஸ்து இயேசுவுக்குள் காத்துக்கொள்ளும்."* — **பிலிப்பியர் 4:6-7**

> *"அவர் உங்களை விசாரிக்கிறவரானபடியால், உங்கள் கவலைகளையெல்லாம் அவர்மேல் வைத்துவிடுங்கள்."* — **1 பேதுரு 5:7**

---

#### 1. வேதாகமப் படிகள்:
1. கவலையை உடனடியாக ஸ்தோத்திரத்தோடு கூடிய ஜெபமாக மாற்றுங்கள்.
2. மத்தேயு 6:33-ன் படி தேவனுடைய ராஜ்யத்திற்கு முதலிடம் கொடுங்கள்.
3. எரேமியா 29:11-ல் கூறப்பட்ட தேவனுடைய சமாதானத்துக்கேதுவான நினைவுகளில் இளைப்பாறுங்கள்.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Philippians 4:6-7', '1 Peter 5:7', 'Isaiah 41:10', 'Jeremiah 29:11'],
        disclaimer: 'கடுமையான மன உளைச்சல் அல்லது மருத்துவ அவசரநிலைகளுக்கு தொழில்முறை மருத்துவர்களையும் போதகர்களையும் அணுகவும்.'
      };
    }

    return {
      responseText: `### 🌿 Overcoming Anxiety and Finding Hope in Scripture

**Key Scripture Promises (WEB):**
> *"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."* — **Philippians 4:6-7**

> *"Cast all your anxiety on Him because He cares for you."* — **1 Peter 5:7**

---

#### 1. Biblical Strategy Against Anxiety:
- **Prayer Displaces Panic:** Turn every anxious thought into an active prayer of thanksgiving.
- **God's Fatherly Care:** Jesus points to the sparrows and lilies—you are of far greater value (Matthew 6:26).
- **Peace as a Guard:** God's peace garrisons (guards as a soldier) your mind against despair.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Philippians 4:6-7', '1 Peter 5:7', 'Isaiah 40:31', 'Jeremiah 29:11'],
      disclaimer: 'For acute clinical anxiety or medical distress, please consult qualified medical professionals alongside prayer.'
    };
  }

  // =========================================================================
  // 7. BIBLE STUDY ON PRAYER / ஜெப ஆய்வு
  // =========================================================================
  if (p.includes('study on prayer') || p.includes('bible study') || p.includes('prayer outline') || p.includes('ஜெப ஆய்வு') || p.includes('ஜெபம்')) {
    if (isTamil) {
      return {
        responseText: `### 📖 ஜெபத்தைக் குறித்த வேதாகமப் படிப்பு (Bible Study Outline)

#### பாடம்: "கிறிஸ்தவ ஜெபத்தின் வல்லமையும் வழிமுறையும்"

---

#### 1. கர்த்தரின் மாதிரி ஜெபம் (மத்தேயு 6:9-13):
1. **ஆராதனை:** *"பரமண்டலங்களிலிருக்கிற எங்கள் பிதாவே, உம்முடைய நாமம் பரிசுத்தப்படுவதாக."*
2. **தேவனுடைய சித்தம்:** *"உம்முடைய ராஜ்யம் வருவதாக; உம்முடைய சித்தம் செய்யப்படுவதாக."*
3. **அன்றாடத் தேவை:** *"எங்களுக்கு வேண்டிய ஆகாரத்தை இன்று எங்களுக்குத் தாரும்."*
4. **மன்னிப்பு:** *"எங்கள் கடன்களை எங்களுக்கு மன்னியும்."*
5. **பாதுகாப்பு:** *"தீமையினின்று எங்களை இரட்சித்துக்கொள்ளும்."*

#### 2. ACTS ஜெப முறை:
- **A — Adoration (துதி & ஆராதனை)**
- **C — Confession (பாவ அறிக்கை)**
- **T — Thanksgiving (நன்றி செலுத்துதல்)**
- **S — Supplication (விண்ணப்பம் பண்ணுதல்)**`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: ['Matthew 6:9-13', 'Jeremiah 33:3', '1 Thessalonians 5:16-18', 'James 5:16'],
        disclaimer: 'இந்த வேதாகமப் படிப்புக் குறிப்புகளை உங்கள் செல் குழுவிலும் குடும்ப ஜெபத்திலும் பயன்படுத்தலாம்.'
      };
    }

    return {
      responseText: `### 📖 Bible Study Outline: Foundations of Christian Prayer

#### 1. The Lord’s Prayer Model (Matthew 6:9-13):
1. **Adoration:** *"Our Father in heaven, hallowed be Your name..."*
2. **Alignment:** *"Your kingdom come, Your will be done..."*
3. **Assurance:** *"Give us this day our daily bread..."*
4. **Absolution:** *"And forgive us our debts..."*
5. **Armor:** *"Deliver us from the evil one..."*

#### 2. The ACTS Devotional Method:
- **A — Adoration:** Praising God for His holiness and character.
- **C — Confession:** Acknowledging sins and receiving cleansing (1 John 1:9).
- **T — Thanksgiving:** Expressing heartfelt gratitude for His blessings.
- **S — Supplication:** Interceding for your church, family, and needs.`,
      source: 'theological_engine',
      isFallback: false,
      scriptureReferences: ['Matthew 6:9-13', 'Philippians 4:6-7', '1 Thessalonians 5:16-18', 'Hebrews 4:16'],
      disclaimer: 'Feel free to adapt this study outline for personal devotions, small groups, and church ministry.'
    };
  }

  // =========================================================================
  // 8. DYNAMIC BIBLE BOOK DETECTOR (ANY of the 66 Books of the Bible!)
  // =========================================================================
  for (const [key, book] of Object.entries(BIBLE_BOOKS_CATALOG)) {
    const keySingular = key.endsWith('s') ? key.slice(0, -1) : key;
    if (p.includes(key) || p.includes(keySingular) || p.includes(book.tamilName)) {
      const bookNameCap = key.charAt(0).toUpperCase() + key.slice(1);
      
      if (isTamil) {
        return {
          responseText: `### 📖 வேதாகம நூல் விளக்கம்: **${book.tamilName} (${bookNameCap})**

#### 1. பொது அறிமுகம்:
- **எழுத்தாளர்:** ${book.author}
- **ஏற்பாடு:** ${book.testament === 'Old' ? 'பழைய ஏற்பாடு' : 'புதிய ஏற்பாடு'}
- **முக்கிய தீம்:** ${book.theme}

#### 2. இந்த நூலின் முக்கிய செய்திகள்:
${bookNameCap} புத்தகம் தேவனுடைய மீட்பின் திட்டத்தையும், விசுவாசிகள் எவ்வாறு தேவனுக்கு உண்மையாக வாழ வேண்டும் என்பதையும் போதிக்கிறது.

#### 3. தியானிக்க வேண்டிய முக்கிய வசனங்கள்:
${book.keyVerses.map(v => `- **${v}**`).join('\n')}

#### 4. கிறிஸ்துவை நோக்கிய பார்வை:
வேதாகமத்தின் ஒவ்வொரு புத்தகமும் இயேசு கிறிஸ்துவை முன்னறிவிக்கிறது அல்லது பிரதிபலிக்கிறது. ${bookNameCap} புத்தகமும் தேவனுடைய பரிசுத்தம், நீதி மற்றும் இரக்கத்தை கிறிஸ்துவில் வெளிப்படுத்துகிறது.`,
          source: 'theological_engine',
          isFallback: false,
          scriptureReferences: book.keyVerses,
          disclaimer: 'ஆழமான இறையியல் விளக்கங்களுக்கும் திருச்சபைக் கோட்பாடுகளுக்கும் உங்கள் சபை போதகரிடம் ஆலோசிக்கவும்.'
        };
      }

      return {
        responseText: `### 📖 Biblical Exposition: **Book of ${bookNameCap}**

#### 1. Book Overview:
- **Human Author:** ${book.author}
- **Testament:** ${book.testament} Testament
- **Central Theme:** ${book.theme}

#### 2. Theological Purpose:
The Book of ${bookNameCap} reveals essential dimensions of God’s redemptive covenant, guiding God's people in faith, holy living, and obedience across generations.

#### 3. Key Scripture Anchor Verses:
${book.keyVerses.map(v => `- **${v}**`).join('\n')}

#### 4. Christological Connection:
Every book of Scripture ultimately testifies of Jesus Christ (Luke 24:27). In ${bookNameCap}, we discover God’s righteousness, grace, and eternal purpose fulfilled through Christ.`,
        source: 'theological_engine',
        isFallback: false,
        scriptureReferences: book.keyVerses,
        disclaimer: 'This devotional overview is provided to guide your Bible study. For detailed doctrinal questions, consult your church elders and pastoral team.'
      };
    }
  }

  // =========================================================================
  // 9. GENERAL EXPOSITORY RESPONSE WITH DYNAMIC PROMPT ADDRESSING
  // =========================================================================
  const cleanTopic = prompt.trim();

  if (isTamil) {
    return {
      responseText: `### 📖 வேதாகம இறையியல் விளக்கம்: **${cleanTopic}**

#### 1. வேதாகமப் பார்வை & வசன மையம்:
பரிசுத்த வேதாகமத்தின் மையச் செய்தி இயேசு கிறிஸ்துவில் வெளிப்படும் தேவனுடைய மீட்பும் கிருபையுமாகும் (2 தீமோத்தேயு 3:15-17). நீங்கள் கேட்ட காரியத்தைக் குறித்து வேதம் பின்வரும் சத்தியங்களைப் போதிக்கிறது:
- தேவன் தம்முடைய பரிசுத்த வார்த்தையின் மூலமாக தமது மாறாத சித்தத்தை வெளிப்படுத்துகிறார்.
- **சங்கீதம் 119:105:** *"உம்முடைய வசனம் என் கால்களுக்குத் தீபமும், என் பாதைக்கு வெளிச்சமுமாயிருக்கிறது."*
- **கொலோசெயர் 3:16:** கிறிஸ்துவின் வசனம் உங்களுக்குள்ளே சகல ஞானத்தோடும் பரிபூரணமாக வாசமாயிருக்கக்கடவது.

#### 2. வரலாற்று மற்றும் உடன்படிக்கைச் சூழல்:
பழைய ஏற்பாட்டிலும் புதிய ஏற்பாட்டிலும் தேவனுடைய வெளிப்பாடுகள் மனித ஞானத்தினால் அல்ல, அவருடைய உடன்படிக்கை உண்மையினால் (Covenant Faithfulness) அருளப்படுகின்றன. வேத வாக்கியங்கள் கிறிஸ்துவை முன்னறிவித்து நிறைவேற்றுகின்றன (லூக்கா 24:27).

#### 3. கிறிஸ்துவை நோக்கிய பார்வை & நடைமுறைப் பிரயோகம்:
- **விசுவாசத்தில் நிலைத்திருங்கள்:** அன்றாட வாழ்வில் தேவனுடைய வார்த்தைக்கு முதலிடம் கொடுத்து, ஜெபத்தோடு வசனங்களைத் தியானியுங்கள்.
- **சபை ஐக்கியம்:** தனிப்பட்ட ஆவிக்குரிய வளர்ச்சிக்கும் ஆழமான வேத ஆலோசனைகளுக்கும் உங்கள் சபை போதகர்களோடு இணைந்து பயணியுங்கள்.`,
      source: 'theological_engine',
      isFallback: true,
      scriptureReferences: ['2 Timothy 3:15-17', 'Psalm 119:105', 'Colossians 3:16', 'Luke 24:27'],
      disclaimer: 'ஆழமான இறையியல் விளக்கங்களுக்கும் தனிப்பட்ட ஆவிக்குரிய ஆலோசனைக்கும் உங்கள் சபை போதகரிடம் ஆலோசிக்கவும்.'
    };
  }

  return {
    responseText: `### 📖 Biblical & Theological Exposition: **${cleanTopic}**

#### 1. Scriptural Foundation & Textual Anchor:
God's Holy Word is living, active, and the authoritative standard for Christian faith and life (2 Timothy 3:16-17; Hebrews 4:12). In addressing **"${cleanTopic}"**, Scripture guides believers through clear biblical revelation:
- God's truth is grounded in His unchanging character, holy righteousness, and redemptive mercy.
- *"Your word is a lamp for my feet, a light on my path."* — **Psalm 119:105**
- *"Let the word of Christ dwell in you richly in all wisdom..."* — **Colossians 3:16**

#### 2. Canonical & Covenant Context:
Across the canon of Scripture—from the Old Testament covenants to their climax in the New Covenant through Jesus Christ—biblical truths must be understood in their proper historical, literary, and redemptive setting. Scripture interprets Scripture: obscure matters are clarified by clear foundational gospel promises.

#### 3. Christological Center & Practical Application:
- **Ground Your Faith in Christ:** Every doctrine of Scripture finds its ultimate meaning and fulfillment in the person and finished work of Jesus Christ (Luke 24:27; John 5:39).
- **Daily Discipleship:** Let biblical truth transform your daily thoughts, relationships, and actions rather than conforming to the world (Romans 12:2).
- **Pastoral Fellowship:** Cultivate regular personal Bible reading and engage with your local church fellowship and pastoral elders for continued discipleship.`,
    source: 'theological_engine',
    isFallback: true,
    scriptureReferences: ['2 Timothy 3:16-17', 'Psalm 119:105', 'Colossians 3:16', 'Luke 24:27', 'Romans 12:2'],
    disclaimer: 'This devotional response is intended to assist your Bible study. For authoritative doctrinal and pastoral guidance, consult your church pastoral team.'
  };
}

export const aiBibleAssistantService = {
  /**
   * Main query method:
   * 1. Checks for VITE_GEMINI_API_KEY (direct GoogleGenAI client)
   * 2. Checks for VITE_AI_BACKEND_URL (secure Cloud Function proxy)
   * 3. Falls back to our extensive, multi-chapter Theological Knowledge Engine
   */
  async askAssistant(options: AiBibleQueryOptions): Promise<AiBibleAssistantResponse> {
    const prompt = options.prompt.trim();

    // Option A: If Gemini API key is configured in frontend environment, use live Google Gemini
    const localApiKey = getGeminiApiKey();
    if (localApiKey) {
      try {
        const languageRequested = options.preferredLanguage || 'auto';
        const history = options.conversationHistory || [];

        const systemPrompt = `You are a reverent, biblically sound, and scholarly AI Bible Assistant for a Church Management System.
Your mission is to provide passage-centered exposition grounded in Holy Scripture rather than generic study advice.

Core Guidelines:
1. DIRECT PASSAGE EXPOSITION FIRST: When asked about a specific passage or chapter (e.g., Psalm 32, Romans 4), quote and explain the specific text, historical context, key Hebrew/Greek words, and verse-by-verse/section meaning before conclusions. Never substitute generic study guidelines.
2. CONTEXTUAL INTERPRETATION: Interpret each passage within its immediate literary context, the author's argument, and whole-Bible teaching.
3. CANONICAL CROSS-REFERENCES: Connect Old Testament passages to New Testament quotations and fulfillments (e.g., connect Psalm 32 with Romans 4).
4. AVOID OVER-TEMPLATING: Let the biblical text and user question determine the structure and depth. Never output boilerplate checklists.
5. PRACTICAL APPLICATION: Derive sound theological insights and authentic devotional applications directly from the exegeted text.
6. RESPONSIBLE INTERPRETATION: Put verbatim Scripture in quotation marks; distinguish explicit biblical statements from inferences; acknowledge differing Christian traditions charitably. Support English and Tamil (தமிழ்) fluently. For deep personal counseling, encourage consulting church pastors.`;

        const fullPrompt = `${systemPrompt}

[TARGET LANGUAGE]: ${languageRequested}
[CONVERSATION HISTORY]:
${history.slice(-4).map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

[USER QUESTION]:
${prompt}`;

        let resultText = '';
        const candidateModels = [
          'gemini-3-flash-preview',
          'gemini-3.5-flash',
          'gemini-3.8-flash'
        ];

        // 1. Direct REST fetch to Google Generative Language API (cross-platform, reliable across Web & Android Capacitor)
        for (const modelName of candidateModels) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(localApiKey)}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }]
              })
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text && text.trim().length > 0) {
                resultText = text.trim();
                break;
              }
            } else {
              const errData = await response.json().catch(() => ({}));
              console.warn(`aiBibleAssistantService: ${modelName} returned HTTP ${response.status}:`, errData?.error?.message || response.statusText);
            }
          } catch (fetchErr) {
            console.warn(`aiBibleAssistantService: fetch call to ${modelName} encountered error:`, fetchErr);
          }
        }

        // 2. Secondary fallback to GoogleGenAI SDK if direct fetch was not completed
        if (!resultText) {
          try {
            const ai = new GoogleGenAI({ apiKey: localApiKey });
            for (const modelName of candidateModels) {
              try {
                const res = await ai.models.generateContent({
                  model: modelName,
                  contents: fullPrompt,
                });
                if (res && res.text) {
                  resultText = res.text;
                  break;
                }
              } catch (sdkErr) {
                // Try next candidate model
              }
            }
          } catch (sdkInitErr) {
            // SDK initialization fallback
          }
        }

        if (resultText) {
          return {
            responseText: resultText,
            source: 'cloud_gemini',
            isFallback: false,
            scriptureReferences: [],
            disclaimer: 'AI responses are provided for devotional study. Consult Scripture and your church pastors for personal guidance.',
          };
        }
      } catch (geminiError) {
        console.warn('aiBibleAssistantService: Live Gemini call failed, using theological engine:', geminiError);
      }
    }

    // Option B: If backend proxy URL is configured
    const backendUrl = (import.meta as any)?.env?.VITE_AI_BACKEND_URL;
    if (backendUrl && typeof backendUrl === 'string' && backendUrl.startsWith('http')) {
      try {
        const res = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            userId: options.userId,
            churchId: options.churchId,
            preferredLanguage: options.preferredLanguage || 'auto',
            conversationHistory: options.conversationHistory?.slice(-6),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            responseText: data.responseText,
            source: 'cloud_backend',
            isFallback: false,
            scriptureReferences: data.scriptureReferences || [],
            disclaimer: data.disclaimer || 'AI responses are provided for devotional study. Consult Scripture and church pastors for guidance.',
          };
        }
      } catch (backendError) {
        console.warn('aiBibleAssistantService: Backend call failed, using theological engine:', backendError);
      }
    }

    // Option C: Rich local theological engine
    return generateTheologicalEngineResponse(prompt, options.preferredLanguage);
  },

  getStoredChatHistory(userId: string): AiBibleMessage[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return [];
  },

  saveStoredChatHistory(userId: string, messages: AiBibleMessage[]): void {
    if (!userId) return;
    try {
      localStorage.setItem(`${CHAT_STORAGE_PREFIX}${userId}`, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  },

  clearStoredChatHistory(userId: string): void {
    if (!userId) return;
    try {
      localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${userId}`);
    } catch {
      // Ignore
    }
  }
};
