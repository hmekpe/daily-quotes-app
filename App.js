import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Platform,
  Image, AppState, Share, Linking, BackHandler,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';

// expo-notifications crashes on load inside Expo Go (Android), so load it defensively.
// In Expo Go everything else works; daily notifications work in the installed app build.
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true,
      shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
} catch (e) {
  Notifications = null;
}

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const KEYS = {
  fav: 'quotes.fav.v2', notes: 'quotes.notes.v1', settings: 'quotes.settings.v1',
  opens: 'quotes.opens.v1', authors: 'quotes.authors.v1',
};

// ---------- colour system: dark gray, diamond ice, neon, gold ----------
const C = {
  bg: '#0B0D11', bg2: '#12151B', card: '#171A21', card2: '#1D212A',
  line: 'rgba(159,216,255,0.14)', lineStrong: 'rgba(159,216,255,0.30)',
  text: '#F2F5FA', muted: '#9AA3B5', ice: '#DDF3FF', diamond: '#9FD8FF',
  cyan: '#22E4FF', violet: '#8B5CFF', magenta: '#FF4FD8',
  gold: '#E6C468', goldDeep: '#C9A227', onNeon: '#06121A', danger: '#FF7A8A',
};
const NEON = [C.cyan, C.violet, C.magenta];
const glow = (color, r = 12) => ({ textShadowColor: color, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });

const CATS = {
  Motivation: { color: '#FFB020' },
  Psychology: { color: '#B388FF' },
  Faith: { color: '#9FD8FF' },
  Wisdom: { color: '#22E4FF' },
  Leadership: { color: '#FF4FD8' },
};
const CAT_NAMES = Object.keys(CATS);
// Sunday .. Saturday: the theme of the day (used when "match the day" is on)
const WEEK_THEME = ['Faith', 'Motivation', 'Psychology', 'Wisdom', 'Leadership', 'Motivation', 'Wisdom'];

// ---------- authors: short built-in bio (works offline) + Wikipedia page for photo and full bio ----------
const AUTHORS = {
  'Steve Jobs': { role: 'Co-founder of Apple, 1955 to 2011', wiki: 'Steve_Jobs' },
  'Ernest Hemingway': { role: 'American novelist, 1899 to 1961', wiki: 'Ernest_Hemingway' },
  'Maya Angelou': { role: 'American poet and civil rights activist, 1928 to 2014', wiki: 'Maya_Angelou' },
  'Theodore Roosevelt': { role: '26th President of the United States, 1858 to 1919', wiki: 'Theodore_Roosevelt' },
  'Arthur Ashe': { role: 'American tennis champion and activist, 1943 to 1993', wiki: 'Arthur_Ashe' },
  'Wayne Gretzky': { role: 'Canadian ice hockey legend, born 1961', wiki: 'Wayne_Gretzky' },
  'Confucius': { role: 'Chinese philosopher, 551 to 479 BC', wiki: 'Confucius' },
  'Lao Tzu': { role: 'Ancient Chinese philosopher, 6th century BC', wiki: 'Laozi' },
  'Jim Rohn': { role: 'American entrepreneur and speaker, 1930 to 2009', wiki: 'Jim_Rohn' },
  'Eleanor Roosevelt': { role: 'First Lady of the United States and diplomat, 1884 to 1962', wiki: 'Eleanor_Roosevelt' },
  'Robert Frost': { role: 'American poet, 1874 to 1963', wiki: 'Robert_Frost' },
  'Will Durant': { role: 'American historian and philosopher, 1885 to 1981', wiki: 'Will_Durant' },
  'Benjamin Franklin': { role: 'American polymath and Founding Father, 1706 to 1790', wiki: 'Benjamin_Franklin' },
  'Edmund Hillary': { role: 'New Zealand mountaineer, 1919 to 2008', wiki: 'Edmund_Hillary' },
  'William Ernest Henley': { role: 'English poet, 1849 to 1903', wiki: 'William_Ernest_Henley' },
  'Carl Jung': { role: 'Swiss psychiatrist, 1875 to 1961', wiki: 'Carl_Jung' },
  'Carl Rogers': { role: 'American psychologist, 1902 to 1987', wiki: 'Carl_Rogers' },
  'Viktor Frankl': { role: 'Austrian psychiatrist and Holocaust survivor, 1905 to 1997', wiki: 'Viktor_Frankl' },
  'Abraham Maslow': { role: 'American psychologist, 1908 to 1970', wiki: 'Abraham_Maslow' },
  'Daniel Kahneman': { role: 'Psychologist and Nobel laureate, 1934 to 2024', wiki: 'Daniel_Kahneman' },
  'Angela Duckworth': { role: 'American psychologist, born 1970', wiki: 'Angela_Duckworth' },
  'Carol Dweck': { role: 'American psychologist, born 1946', wiki: 'Carol_Dweck' },
  'Brené Brown': { role: 'American researcher and author, born 1965', wiki: 'Brené_Brown' },
  'Alfred Adler': { role: 'Austrian psychologist, 1870 to 1937', wiki: 'Alfred_Adler' },
  'William James': { role: 'American philosopher and psychologist, 1842 to 1910', wiki: 'William_James' },
  'Nathaniel Branden': { role: 'Canadian-American psychotherapist, 1930 to 2014', wiki: 'Nathaniel_Branden' },
  'Mihaly Csikszentmihalyi': { role: 'Hungarian-American psychologist, 1934 to 2021', wiki: 'Mihaly_Csikszentmihalyi' },
  'Socrates': { role: 'Greek philosopher, about 470 to 399 BC', wiki: 'Socrates' },
  'Epictetus': { role: 'Stoic philosopher, about 50 to 135 AD', wiki: 'Epictetus' },
  'Marcus Aurelius': { role: 'Roman emperor and Stoic philosopher, 121 to 180', wiki: 'Marcus_Aurelius' },
  'Seneca': { role: 'Roman Stoic philosopher, about 4 BC to 65 AD', wiki: 'Seneca_the_Younger' },
  'Albert Einstein': { role: 'Theoretical physicist, 1879 to 1955', wiki: 'Albert_Einstein' },
  'Ralph Waldo Emerson': { role: 'American essayist and philosopher, 1803 to 1882', wiki: 'Ralph_Waldo_Emerson' },
  'Dalai Lama': { role: 'Tibetan spiritual leader, born 1935', wiki: '14th_Dalai_Lama' },
  'Helen Keller': { role: 'American author and activist, 1880 to 1968', wiki: 'Helen_Keller' },
  'Anne Frank': { role: 'Diarist and Holocaust victim, 1929 to 1945', wiki: 'Anne_Frank' },
  'Henry David Thoreau': { role: 'American essayist and naturalist, 1817 to 1862', wiki: 'Henry_David_Thoreau' },
  'Plato': { role: 'Greek philosopher, about 428 to 348 BC', wiki: 'Plato' },
  'Simon Sinek': { role: 'British-American author and speaker, born 1973', wiki: 'Simon_Sinek' },
  'Martin Luther King Jr.': { role: 'American civil rights leader, 1929 to 1968', wiki: 'Martin_Luther_King_Jr.' },
  'John F. Kennedy': { role: '35th President of the United States, 1917 to 1963', wiki: 'John_F._Kennedy' },
  'Rosa Parks': { role: 'American civil rights activist, 1913 to 2005', wiki: 'Rosa_Parks' },
  'Franklin D. Roosevelt': { role: '32nd President of the United States, 1882 to 1945', wiki: 'Franklin_D._Roosevelt' },
  'Nelson Mandela': { role: 'South African president and anti-apartheid leader, 1918 to 2013', wiki: 'Nelson_Mandela' },
  'Dwight D. Eisenhower': { role: '34th President of the United States, 1890 to 1969', wiki: 'Dwight_D._Eisenhower' },
  'Mother Teresa': { role: 'Catholic missionary in Kolkata, 1910 to 1997', wiki: 'Mother_Teresa' },
  'Japanese proverb': { role: 'Traditional saying from Japan', wiki: null },
};
const SCRIPTURE_RE = /\d+:\d+$/;
const authorMeta = (name) =>
  SCRIPTURE_RE.test(name)
    ? { role: 'The Holy Bible, King James Version', wiki: null, scripture: true }
    : AUTHORS[name] || { role: '', wiki: null };

// ---------- the quote library (category, author, text) ----------
const RAW = [
  ['Motivation', 'Steve Jobs', 'The only way to do great work is to love what you do.'],
  ['Motivation', 'Ernest Hemingway', 'Courage is grace under pressure.'],
  ['Motivation', 'Maya Angelou', 'Nothing will work unless you do.'],
  ['Motivation', 'Theodore Roosevelt', 'Do what you can, with what you have, where you are.'],
  ['Motivation', 'Arthur Ashe', 'Start where you are. Use what you have. Do what you can.'],
  ['Motivation', 'Wayne Gretzky', "You miss 100% of the shots you don't take."],
  ['Motivation', 'Confucius', 'It does not matter how slowly you go as long as you do not stop.'],
  ['Motivation', 'Japanese proverb', 'Fall seven times, stand up eight.'],
  ['Motivation', 'Lao Tzu', 'The journey of a thousand miles begins with a single step.'],
  ['Motivation', 'Jim Rohn', 'Discipline is the bridge between goals and accomplishment.'],
  ['Motivation', 'Eleanor Roosevelt', 'You must do the thing you think you cannot do.'],
  ['Motivation', 'Robert Frost', 'The best way out is always through.'],
  ['Motivation', 'Will Durant', 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.'],
  ['Motivation', 'Benjamin Franklin', 'Energy and persistence conquer all things.'],
  ['Motivation', 'Edmund Hillary', 'It is not the mountain we conquer, but ourselves.'],
  ['Motivation', 'William Ernest Henley', 'I am the master of my fate, I am the captain of my soul.'],
  ['Motivation', 'Benjamin Franklin', 'Well done is better than well said.'],
  ['Psychology', 'Carl Jung', 'Who looks outside, dreams; who looks inside, awakes.'],
  ['Psychology', 'Carl Rogers', 'The curious paradox is that when I accept myself just as I am, then I can change.'],
  ['Psychology', 'Viktor Frankl', 'When we are no longer able to change a situation, we are challenged to change ourselves.'],
  ['Psychology', 'Viktor Frankl', "Everything can be taken from a man but one thing: the last of the human freedoms, to choose one's attitude in any given set of circumstances."],
  ['Psychology', 'Abraham Maslow', 'What is necessary to change a person is to change his awareness of himself.'],
  ['Psychology', 'Abraham Maslow', 'If the only tool you have is a hammer, it is tempting to treat everything as if it were a nail.'],
  ['Psychology', 'Daniel Kahneman', 'Nothing in life is as important as you think it is, while you are thinking about it.'],
  ['Psychology', 'Angela Duckworth', 'Enthusiasm is common. Endurance is rare.'],
  ['Psychology', 'Carol Dweck', 'Becoming is better than being.'],
  ['Psychology', 'Brené Brown', 'Courage starts with showing up and letting ourselves be seen.'],
  ['Psychology', 'Alfred Adler', "It is easier to fight for one's principles than to live up to them."],
  ['Psychology', 'Carl Jung', 'We cannot change anything unless we accept it.'],
  ['Psychology', 'William James', 'Habit is the enormous fly-wheel of society, its most precious conservative agent.'],
  ['Psychology', 'Nathaniel Branden', 'The first step toward change is awareness. The second step is acceptance.'],
  ['Psychology', 'Carl Jung', 'Everything that irritates us about others can lead us to an understanding of ourselves.'],
  ['Psychology', 'Mihaly Csikszentmihalyi', "The best moments usually occur when a person's body or mind is stretched to its limits."],
  ['Faith', 'Philippians 4:13', 'I can do all things through Christ which strengtheneth me.'],
  ['Faith', 'Psalm 23:1', 'The LORD is my shepherd; I shall not want.'],
  ['Faith', 'Proverbs 3:5', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'],
  ['Faith', 'Joshua 1:9', 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'],
  ['Faith', 'Jeremiah 29:11', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.'],
  ['Faith', 'Psalm 46:10', 'Be still, and know that I am God.'],
  ['Faith', 'Psalm 55:22', 'Cast thy burden upon the LORD, and he shall sustain thee.'],
  ['Faith', 'Isaiah 40:31', 'They that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'],
  ['Faith', 'Romans 8:28', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'],
  ['Faith', 'John 14:27', 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.'],
  ['Faith', 'Isaiah 41:10', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.'],
  ['Faith', 'Matthew 7:7', 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.'],
  ['Faith', 'Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.'],
  ['Faith', 'Galatians 6:9', 'Let us not be weary in well doing: for in due season we shall reap, if we faint not.'],
  ['Faith', 'Hebrews 11:1', 'Now faith is the substance of things hoped for, the evidence of things not seen.'],
  ['Faith', 'Mother Teresa', 'Not all of us can do great things. But we can do small things with great love.'],
  ['Wisdom', 'Socrates', 'The unexamined life is not worth living.'],
  ['Wisdom', 'Epictetus', 'Man is not disturbed by things, but by the views he takes of them.'],
  ['Wisdom', 'Marcus Aurelius', 'The best revenge is not to be like your enemy.'],
  ['Wisdom', 'Marcus Aurelius', 'Waste no more time arguing about what a good man should be. Be one.'],
  ['Wisdom', 'Seneca', 'We suffer more often in imagination than in reality.'],
  ['Wisdom', 'Lao Tzu', 'Knowing others is intelligence; knowing yourself is true wisdom.'],
  ['Wisdom', 'Albert Einstein', 'Imagination is more important than knowledge.'],
  ['Wisdom', 'Ralph Waldo Emerson', 'Nothing great was ever achieved without enthusiasm.'],
  ['Wisdom', 'Dalai Lama', 'Happiness is not something ready made. It comes from your own actions.'],
  ['Wisdom', 'Helen Keller', 'Although the world is full of suffering, it is full also of the overcoming of it.'],
  ['Wisdom', 'Anne Frank', 'How wonderful it is that nobody need wait a single moment before starting to improve the world.'],
  ['Wisdom', 'Henry David Thoreau', 'The question is not what you look at, but what you see.'],
  ['Wisdom', 'Plato', 'The beginning is the most important part of the work.'],
  ['Wisdom', 'Confucius', "Real knowledge is to know the extent of one's ignorance."],
  ['Wisdom', 'Benjamin Franklin', 'An investment in knowledge pays the best interest.'],
  ['Leadership', 'Simon Sinek', 'Leadership is not about being in charge. It is about taking care of those in your charge.'],
  ['Leadership', 'Lao Tzu', 'A leader is best when people barely know he exists.'],
  ['Leadership', 'Theodore Roosevelt', 'The best executive is the one who has sense enough to pick good men to do what he wants done, and self-restraint enough to keep from meddling with them while they do it.'],
  ['Leadership', 'Martin Luther King Jr.', 'The ultimate measure of a man is not where he stands in moments of comfort and convenience, but where he stands at times of challenge and controversy.'],
  ['Leadership', 'Martin Luther King Jr.', 'Darkness cannot drive out darkness; only light can do that.'],
  ['Leadership', 'Martin Luther King Jr.', 'Injustice anywhere is a threat to justice everywhere.'],
  ['Leadership', 'John F. Kennedy', 'Leadership and learning are indispensable to each other.'],
  ['Leadership', 'Rosa Parks', "I have learned over the years that when one's mind is made up, this diminishes fear."],
  ['Leadership', 'Franklin D. Roosevelt', 'The only thing we have to fear is fear itself.'],
  ['Leadership', 'Nelson Mandela', 'Education is the most powerful weapon which you can use to change the world.'],
  ['Leadership', 'Nelson Mandela', 'I learned that courage was not the absence of fear, but the triumph over it.'],
  ['Leadership', 'Dwight D. Eisenhower', 'Leadership is the art of getting someone else to do something you want done because he wants to do it.'],
];

const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
const QUOTES = RAW.map(([cat, author, text]) => ({ id: 'q' + hashStr(text).toString(36), cat, author, text }));
const QUOTE_BY_ID = Object.fromEntries(QUOTES.map((q) => [q.id, q]));

// ---------- the daily pick: random-looking, but the same for a given date ----------
const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const DEFAULT_SETTINGS = { topics: [...CAT_NAMES], smart: true, notif: { on: false, hour: 8, minute: 0 } };

function poolFor(date, settings) {
  const topics = settings.topics.length ? settings.topics : CAT_NAMES;
  let cats = topics;
  if (settings.smart) {
    const theme = WEEK_THEME[date.getDay()];
    if (topics.includes(theme)) cats = [theme];
  }
  return QUOTES.filter((q) => cats.includes(q.cat));
}
const rawPick = (date, pool) => seededShuffle(pool, hashStr(dateKey(date) + '|' + pool.length))[0];
function dailyQuoteFor(date, settings) {
  const pool = poolFor(date, settings);
  const y1 = new Date(date); y1.setDate(y1.getDate() - 1);
  const y2 = new Date(date); y2.setDate(y2.getDate() - 2);
  const avoid = new Set([rawPick(y1, poolFor(y1, settings)).id, rawPick(y2, poolFor(y2, settings)).id]);
  const order = seededShuffle(pool, hashStr(dateKey(date) + '|' + pool.length));
  return order.find((q) => !avoid.has(q.id)) || order[0];
}

function calcStreak(openSet, today) {
  let n = 0;
  const d = new Date(today);
  while (openSet.has(dateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const greeting = (h) => (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
const fmtTime = (h, m) => `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
const dateLabel = (d) => d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
const shortLabel = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const notifBody = (q) => `\u201C${q.text}\u201D\n${q.author}`;
const initialsOf = (name) => name.replace(/[0-9:]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'Q';

function trimBio(text) {
  let out = '';
  for (const part of text.split(/\.\s+/)) {
    if (!part) continue;
    out += part.endsWith('.') ? part + ' ' : part + '. ';
    if (out.length > 300) break;
  }
  return out.trim();
}

async function fetchAuthorInfo(name) {
  const meta = AUTHORS[name];
  if (!meta || !meta.wiki) return null;
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(meta.wiki)}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('bad status');
  const j = await res.json();
  return {
    photo: (j.thumbnail && j.thumbnail.source) || null,
    extract: j.extract || '',
    url: (j.content_urls && ((j.content_urls.mobile && j.content_urls.mobile.page) || (j.content_urls.desktop && j.content_urls.desktop.page))) || null,
    at: Date.now(),
  };
}

// ---------- notifications ----------
async function notifReady() {
  if (!Notifications) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-quote', {
        name: 'Daily quote', importance: Notifications.AndroidImportance.HIGH, lightColor: '#22E4FF',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) { return false; }
}
// Schedules the next 14 days, each with that day's own quote. Returns the count (or -1 on failure).
async function rescheduleNotifications(s) {
  if (!Notifications) return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.notif.on) return 0;
    if (!(await notifReady())) return -1;
    let n = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(s.notif.hour, s.notif.minute, 0, 0);
      if (d.getTime() <= Date.now() + 10000) continue;
      const q = dailyQuoteFor(d, s);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Quote of the Day', body: notifBody(q), data: { dateKey: dateKey(d) }, color: '#22E4FF' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d, channelId: 'daily-quote' },
      });
      n++;
    }
    return n;
  } catch (e) { return -1; }
}

// ---------- small visual pieces ----------
function Facets() {
  return (
    <View style={st.facets} pointerEvents="none">
      <View style={[st.facet, { width: 96, height: 96, top: 22, left: 22, borderColor: 'rgba(159,216,255,0.20)' }]} />
      <View style={[st.facet, { width: 62, height: 62, top: 39, left: 39, borderColor: 'rgba(34,228,255,0.34)' }]} />
      <View style={[st.facet, { width: 30, height: 30, top: 55, left: 55, borderColor: 'rgba(230,196,104,0.55)' }]} />
    </View>
  );
}

function Avatar({ name, uri, size = 64 }) {
  const [bad, setBad] = useState(false);
  useEffect(() => { setBad(false); }, [uri]);
  const inner = size - 6;
  return (
    <LinearGradient colors={[C.diamond, C.cyan, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, padding: 3 }}>
      {uri && !bad ? (
        <Image source={{ uri }} onError={() => setBad(true)} style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: C.card2 }} accessibilityLabel={`Photo of ${name}`} />
      ) : (
        <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.ice, fontSize: inner * 0.36, fontWeight: '800', fontFamily: SERIF }}>{initialsOf(name)}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

function Toggle({ on, onPress, label }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={[st.toggle, on && st.toggleOn]}>
      <View style={[st.knob, on && st.knobOn]} />
    </TouchableOpacity>
  );
}

const SHARE_STYLES = {
  Diamond: { bg: ['#10151F', '#1B2434'], border: [C.diamond, C.cyan, C.violet], accent: C.cyan, text: C.ice },
  Gold: { bg: ['#0C0A06', '#1D1608'], border: [C.goldDeep, '#F5DE9A', C.goldDeep], accent: C.gold, text: '#F7EBC8' },
  Neon: { bg: ['#0E0820', '#1B0B33'], border: [C.magenta, C.violet, C.cyan], accent: C.magenta, text: '#FFE9FB' },
};
function ShareCard({ q, variant }) {
  const v = SHARE_STYLES[variant];
  const size = q.text.length > 150 ? 16 : q.text.length > 90 ? 19 : 23;
  return (
    <LinearGradient colors={v.border} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.shareBorder}>
      <LinearGradient colors={v.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.shareInner}>
        <Text style={[st.shareCat, { color: v.accent }]}>{q.cat.toUpperCase()}</Text>
        <Text style={[st.shareQuote, { color: v.text, fontSize: size, lineHeight: size * 1.42 }]}>{'\u201C'}{q.text}{'\u201D'}</Text>
        <View style={{ height: 2, width: 54, backgroundColor: v.accent, borderRadius: 1, marginVertical: 14 }} />
        <Text style={[st.shareAuthor, { color: v.text }]}>{q.author}</Text>
        <Text style={[st.shareBrand, { color: v.accent }]}>DAILY QUOTES</Text>
      </LinearGradient>
    </LinearGradient>
  );
}

function QuoteView({ q, label, saved, onSave, onShare, onListen, speaking, info, note, onNote }) {
  const meta = authorMeta(q.author);
  const color = CATS[q.cat].color;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note || '');
  const [noteMsg, setNoteMsg] = useState(null);
  useEffect(() => { setDraft(note || ''); setNoteMsg(null); setOpen(false); }, [q.id]);
  const size = q.text.length > 150 ? 22 : q.text.length > 90 ? 25 : 29;
  const bio = info && info.extract ? trimBio(info.extract) : null;

  return (
    <View style={st.cardGlow}>
      <LinearGradient colors={[C.diamond, C.cyan, C.violet, C.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cardBorder}>
        <View style={st.cardInner}>
          <Facets />
          <View style={st.cardTop}>
            <Text style={st.label}>{label}</Text>
            <View style={[st.catPill, { borderColor: color }]}>
              <View style={[st.catDot, { backgroundColor: color }]} />
              <Text style={[st.catText, { color }]}>{q.cat}</Text>
            </View>
          </View>
          <Text style={[st.quoteMark, glow(C.gold, 10)]}>{'\u201C'}</Text>
          <Text style={[st.quoteText, { fontSize: size, lineHeight: size * 1.4 }]} selectable>{q.text}</Text>
          <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.neonRule} />

          <View style={st.authorRow}>
            <Avatar name={q.author} uri={info && info.photo} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.authorName}>{q.author}</Text>
              <Text style={st.authorRole}>{meta.role}</Text>
            </View>
          </View>

          {meta.wiki ? (
            <View>
              <TouchableOpacity onPress={() => setOpen(!open)} style={st.aboutBtn} accessibilityRole="button">
                <Text style={st.aboutText}>{open ? 'Hide biography' : 'About the author'}</Text>
              </TouchableOpacity>
              {open ? (
                <View style={st.bioBox}>
                  {bio ? (
                    <View>
                      <Text style={st.bioText}>{bio}</Text>
                      {info.url ? (
                        <TouchableOpacity onPress={() => Linking.openURL(info.url)} style={st.aboutBtn} accessibilityRole="link">
                          <Text style={st.aboutText}>Read more on Wikipedia</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : info && info.failedAt ? (
                    <Text style={st.bioText}>Could not load the full biography. Check your internet connection and try again later.</Text>
                  ) : (
                    <Text style={st.bioText}>Loading biography...</Text>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={st.actions}>
            <TouchableOpacity style={[st.act, saved && st.actOn]} onPress={onSave} accessibilityRole="button" accessibilityState={{ selected: saved }}>
              <Text style={[st.actText, saved && { color: C.onNeon }]}>{saved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <TouchableOpacity style={st.act} onPress={onShare} accessibilityRole="button">
              <Text style={st.actText}>Share</Text>
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <TouchableOpacity style={[st.act, speaking && st.actOn]} onPress={onListen} accessibilityRole="button">
              <Text style={[st.actText, speaking && { color: C.onNeon }]}>{speaking ? 'Stop' : 'Listen'}</Text>
            </TouchableOpacity>
          </View>

          {saved ? (
            <View style={st.noteBox}>
              <Text style={st.noteTitle}>MY REFLECTION</Text>
              <TextInput
                value={draft} onChangeText={(v) => { setDraft(v); setNoteMsg(null); }}
                placeholder="How does this apply to you today?" placeholderTextColor={C.muted}
                style={st.noteInput} multiline accessibilityLabel="Reflection"
              />
              <TouchableOpacity style={st.noteBtn} onPress={() => { onNote(draft); setNoteMsg('Reflection saved'); }} accessibilityRole="button">
                <Text style={st.noteBtnText}>Save reflection</Text>
              </TouchableOpacity>
              {noteMsg ? <Text style={st.noteOk}>{noteMsg}</Text> : null}
            </View>
          ) : (
            <Text style={st.noteHint}>Save this quote to write a personal reflection.</Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function QuoteRow({ q, saved, hasNote, photo, onPress, sub }) {
  const color = CATS[q.cat].color;
  return (
    <TouchableOpacity style={st.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open quote by ${q.author}`}>
      <View style={[st.rowBar, { backgroundColor: color }]} />
      <View style={{ flex: 1, marginRight: 10 }}>
        {sub ? <Text style={st.rowSub}>{sub}</Text> : null}
        <Text style={st.rowText} numberOfLines={3}>{q.text}</Text>
        <View style={st.rowMeta}>
          <Text style={st.rowAuthor}>{q.author}</Text>
          <Text style={[st.rowCat, { color }]}>{q.cat}</Text>
        </View>
        {hasNote ? <Text style={st.rowNote}>Has a reflection</Text> : null}
      </View>
      <View style={{ alignItems: 'center' }}>
        <Avatar name={q.author} uri={photo} size={44} />
        {saved ? <Text style={st.rowSaved}>Saved</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('today');
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [favs, setFavs] = useState([]);
  const [notes, setNotes] = useState({});
  const [opens, setOpens] = useState([]);
  const [authors, setAuthors] = useState({});
  const [todayKey, setTodayKey] = useState(dateKey(new Date()));

  const [view, setView] = useState({ id: null });       // id null = today's quote
  const [history, setHistory] = useState([]);
  const [detail, setDetail] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [shareStyle, setShareStyle] = useState('Diamond');
  const [shareMsg, setShareMsg] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);

  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [libMode, setLibMode] = useState('all');

  const [topicMsg, setTopicMsg] = useState(null);
  const [notifMsg, setNotifMsg] = useState(null);
  const [scheduled, setScheduled] = useState(null);
  const [showIOSTime, setShowIOSTime] = useState(false);
  const [snack, setSnack] = useState(null);
  const snackTimer = useRef(null);
  const inflight = useRef({});
  const cardRef = useRef(null);

  // ----- load / persist -----
  useEffect(() => {
    const parse = (raw, fallback) => { try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } };
    Promise.all(Object.values(KEYS).map((k) => AsyncStorage.getItem(k)))
      .then(([fav, nts, set, opn, aut]) => {
        const f = parse(fav, []); if (Array.isArray(f)) setFavs(f.filter((id) => QUOTE_BY_ID[id]));
        const n = parse(nts, {}); if (n && typeof n === 'object' && !Array.isArray(n)) setNotes(n);
        const s = parse(set, null);
        if (s && Array.isArray(s.topics)) {
          const topics = s.topics.filter((x) => CATS[x]);
          setSettings({
            topics: topics.length ? topics : [...CAT_NAMES], smart: s.smart !== false,
            notif: { on: !!(s.notif && s.notif.on), hour: Number.isInteger(s.notif && s.notif.hour) ? s.notif.hour : 8, minute: Number.isInteger(s.notif && s.notif.minute) ? s.notif.minute : 0 },
          });
        }
        const o = parse(opn, []); if (Array.isArray(o)) setOpens(o.filter((x) => typeof x === 'string'));
        const a = parse(aut, {}); if (a && typeof a === 'object' && !Array.isArray(a)) setAuthors(a);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => { clearTimeout(snackTimer.current); };
  }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEYS.fav, JSON.stringify(favs)); }, [favs, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEYS.notes, JSON.stringify(notes)); }, [notes, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings)); }, [settings, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEYS.opens, JSON.stringify(opens)); }, [opens, loaded]);
  useEffect(() => { if (loaded) AsyncStorage.setItem(KEYS.authors, JSON.stringify(authors)); }, [authors, loaded]);

  // new day => new quote (checked when the app returns to the foreground and every minute)
  useEffect(() => {
    const refresh = () => setTodayKey(dateKey(new Date()));
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const timer = setInterval(refresh, 60000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);

  // streak: remember every day the app was opened
  useEffect(() => {
    if (!loaded) return;
    setOpens((prev) => (prev.includes(todayKey) ? prev : [...prev, todayKey].slice(-400)));
  }, [loaded, todayKey]);

  // keep the next 14 days of notifications up to date
  const topicsKey = settings.topics.join('|');
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    rescheduleNotifications(settings).then((n) => { if (alive) setScheduled(n); });
    return () => { alive = false; };
  }, [loaded, settings.notif.on, settings.notif.hour, settings.notif.minute, topicsKey, settings.smart, todayKey]);

  // Android back button closes overlays first
  useEffect(() => {
    if (!detail && !sharing) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sharing) setSharing(null); else setDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [detail, sharing]);

  const showSnack = (message, onUndo) => {
    clearTimeout(snackTimer.current);
    setSnack({ message, onUndo });
    snackTimer.current = setTimeout(() => setSnack(null), 5000);
  };
  const undoSnack = () => { if (!snack) return; clearTimeout(snackTimer.current); if (snack.onUndo) snack.onUndo(); setSnack(null); };

  // ----- quotes -----
  const todayQuote = useMemo(() => dailyQuoteFor(new Date(), settings), [todayKey, topicsKey, settings.smart]);
  const current = view.id ? QUOTE_BY_ID[view.id] : todayQuote;
  const isToday = !view.id;

  const anotherQuote = () => {
    const pool = QUOTES.filter((q) => settings.topics.includes(q.cat));
    const recent = new Set([current.id, ...history.filter(Boolean).slice(-10)]);
    const fresh = pool.filter((q) => !recent.has(q.id));
    const pickFrom = fresh.length ? fresh : pool;
    const next = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    setHistory((h) => [...h, view.id]);
    setView({ id: next.id });
  };
  const goBack = () => {
    if (!history.length) return;
    setView({ id: history[history.length - 1] });
    setHistory((h) => h.slice(0, -1));
  };
  const backToToday = () => { setView({ id: null }); setHistory([]); };

  // ----- save / notes -----
  const toggleSave = (q) => {
    const idx = favs.indexOf(q.id);
    if (idx >= 0) {
      setFavs((p) => p.filter((x) => x !== q.id));
      showSnack('Removed from Saved', () => setFavs((p) => { if (p.includes(q.id)) return p; const n = [...p]; n.splice(Math.min(idx, n.length), 0, q.id); return n; }));
    } else {
      setFavs((p) => [q.id, ...p]);
      showSnack('Saved to your collection', () => setFavs((p) => p.filter((x) => x !== q.id)));
    }
  };
  const saveNote = (q, text) => setNotes((p) => { const n = { ...p }; if (text.trim()) n[q.id] = text.trim(); else delete n[q.id]; return n; });

  // ----- authors (photo + biography from Wikipedia, cached) -----
  const ensureAuthor = (name) => {
    const meta = AUTHORS[name];
    if (!meta || !meta.wiki || inflight.current[name]) return;
    const cur = authors[name];
    if (cur && !cur.failedAt && Date.now() - cur.at < 30 * 86400000) return;
    if (cur && cur.failedAt && Date.now() - cur.failedAt < 86400000) return;
    inflight.current[name] = true;
    fetchAuthorInfo(name)
      .then((info) => setAuthors((p) => ({ ...p, [name]: info })))
      .catch(() => setAuthors((p) => ({ ...p, [name]: { failedAt: Date.now() } })))
      .finally(() => { inflight.current[name] = false; });
  };
  useEffect(() => {
    if (!loaded) return;
    ensureAuthor(current.author);
    if (detail) ensureAuthor(detail.author);
  }, [loaded, current.id, detail && detail.id]);

  // ----- listen (text to speech) -----
  const listen = (q) => {
    let Speech;
    try { Speech = require('expo-speech'); } catch (e) { return; }
    if (speakingId === q.id) { Speech.stop(); setSpeakingId(null); return; }
    Speech.stop();
    setSpeakingId(q.id);
    const done = () => setSpeakingId((cur) => (cur === q.id ? null : cur));
    Speech.speak(`${q.text}. ${q.author.replace(/(\d+):(\d+)/, '$1 verse $2')}.`, { language: 'en-US', rate: 0.92, onDone: done, onStopped: done, onError: done });
  };

  // ----- share -----
  const openShare = (q) => { setSharing(q); setShareMsg(null); };
  const shareImage = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareMsg(null);
    try {
      const { captureRef } = require('react-native-view-shot');
      const Sharing = require('expo-sharing');
      const uri = await captureRef(cardRef.current, { format: 'png', quality: 1, width: 1080, height: 1080 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this quote' });
        setShareMsg({ ok: true, text: 'Image ready. Pick an app to share it.' });
      } else {
        setShareMsg({ ok: false, text: 'Sharing is not available on this device. Try Share as text.' });
      }
    } catch (e) {
      setShareMsg({ ok: false, text: 'Could not create the image. Try Share as text instead.' });
    } finally {
      setShareBusy(false);
    }
  };
  const shareText = async (q) => {
    try {
      await Share.share({ message: `\u201C${q.text}\u201D\n\u2014 ${q.author}\n\nShared from Daily Quotes` });
    } catch (e) {
      setShareMsg({ ok: false, text: 'Could not open the share menu.' });
    }
  };

  // ----- settings actions -----
  const toggleTopic = (name) => {
    const on = settings.topics.includes(name);
    if (on && settings.topics.length === 1) { setTopicMsg('Keep at least one topic selected.'); return; }
    setTopicMsg(null);
    setSettings((s) => ({ ...s, topics: on ? s.topics.filter((x) => x !== name) : CAT_NAMES.filter((x) => x === name || s.topics.includes(x)) }));
  };
  const toggleNotif = async () => {
    setNotifMsg(null);
    if (settings.notif.on) { setSettings((s) => ({ ...s, notif: { ...s.notif, on: false } })); return; }
    if (!Notifications) { setNotifMsg({ ok: false, text: 'Notifications are not available in Expo Go. Install the app build to use them.' }); return; }
    if (!(await notifReady())) { setNotifMsg({ ok: false, text: 'Notifications are blocked. Allow them in your phone settings, then try again.' }); return; }
    setSettings((s) => ({ ...s, notif: { ...s.notif, on: true } }));
  };
  const setTime = (hour, minute) => setSettings((s) => ({ ...s, notif: { ...s.notif, hour, minute } }));
  const pickCustomTime = () => {
    const d = new Date(); d.setHours(settings.notif.hour, settings.notif.minute, 0, 0);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: d, mode: 'time', is24Hour: false,
        onChange: (e, picked) => { if (e.type === 'set' && picked) setTime(picked.getHours(), picked.getMinutes()); },
      });
    } else {
      setShowIOSTime(true);
    }
  };
  const sendTest = async () => {
    setNotifMsg(null);
    if (!Notifications) { setNotifMsg({ ok: false, text: 'Notifications are not available in Expo Go. Install the app build to test them.' }); return; }
    if (!(await notifReady())) { setNotifMsg({ ok: false, text: 'Notifications are blocked. Allow them in your phone settings first.' }); return; }
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Quote of the Day', body: notifBody(todayQuote), color: '#22E4FF' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: 'daily-quote' },
      });
      setNotifMsg({ ok: true, text: 'Test sent. It arrives in about 5 seconds. Lock your phone to see the pop-up.' });
    } catch (e) {
      setNotifMsg({ ok: false, text: 'Could not send the test notification.' });
    }
  };

  // ----- derived -----
  const openSet = useMemo(() => new Set(opens), [opens]);
  const streak = calcStreak(openSet, new Date());
  const week = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push({ key: dateKey(d), on: openSet.has(dateKey(d)), label: d.toLocaleDateString([], { weekday: 'short' }).slice(0, 1), today: i === 0 });
    }
    return out;
  }, [openSet, todayKey]);

  const libItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUOTES.filter((x) => (catFilter === 'All' || x.cat === catFilter) &&
      (!q || x.text.toLowerCase().includes(q) || x.author.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q)));
  }, [query, catFilter]);
  const pastDays = useMemo(() => {
    const out = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push({ id: 'd' + i, date: d, q: dailyQuoteFor(d, settings) });
    }
    return out;
  }, [todayKey, topicsKey, settings.smart]);
  const savedQuotes = favs.map((id) => QUOTE_BY_ID[id]).filter(Boolean);

  const now = new Date();
  const theme = WEEK_THEME[now.getDay()];
  const themeActive = settings.smart && settings.topics.includes(theme);

  const nextWhen = (() => {
    const d = new Date(); d.setHours(settings.notif.hour, settings.notif.minute, 0, 0);
    return `${d.getTime() > Date.now() + 10000 ? 'today' : 'tomorrow'} at ${fmtTime(settings.notif.hour, settings.notif.minute)}`;
  })();

  const TABBAR = 62;
  const photoOf = (name) => (authors[name] && authors[name].photo) || null;

  const renderView = (q, label, showDetail) => (
    <QuoteView
      q={q} label={label} saved={favs.includes(q.id)} onSave={() => toggleSave(q)} onShare={() => openShare(q)}
      onListen={() => listen(q)} speaking={speakingId === q.id} info={authors[q.author]} note={notes[q.id]}
      onNote={(text) => saveNote(q, text)}
    />
  );

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar style="light" />
      <LinearGradient colors={[C.bg, C.bg2, C.bg]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ flex: 1 }}>

        {tab === 'today' && (
          <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
            <View style={st.headerIn}>
              <View style={{ flex: 1 }}>
                <Text style={[st.eyebrow, glow(C.cyan, 8)]}>{greeting(now.getHours()).toUpperCase()}</Text>
                <Text style={st.h1}>{dateLabel(now)}</Text>
              </View>
              <View style={st.streakPill} accessibilityLabel={`${streak} day streak`}>
                <Text style={st.streakNum}>{streak}</Text>
                <Text style={st.streakLabel}>day streak</Text>
              </View>
            </View>
            <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.headerRule} />
            {themeActive ? <Text style={st.themeLine}>Theme of the day: {theme}</Text> : <Text style={st.themeLine}>Mixed from your chosen topics</Text>}

            {renderView(current, isToday ? "TODAY'S QUOTE" : 'RANDOM PICK')}

            <View style={st.navRow}>
              {history.length > 0 ? (
                <TouchableOpacity style={st.ghostBtn} onPress={goBack} accessibilityRole="button">
                  <Text style={st.ghostText}>Back</Text>
                </TouchableOpacity>
              ) : null}
              {history.length > 0 ? <View style={{ width: 10 }} /> : null}
              <TouchableOpacity style={{ flex: 1 }} onPress={anotherQuote} accessibilityRole="button">
                <LinearGradient colors={[C.cyan, '#6FA8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.primaryBtn}>
                  <Text style={st.primaryText}>Another quote</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {!isToday ? (
              <TouchableOpacity onPress={backToToday} style={st.linkBtn} accessibilityRole="button">
                <Text style={st.link}>Back to today's quote</Text>
              </TouchableOpacity>
            ) : null}

            <View style={st.streakCard}>
              <View style={st.streakHead}>
                <Text style={st.sectionTitle}>YOUR STREAK</Text>
                <Text style={st.streakText}>{streak === 1 ? '1 day. Come back tomorrow!' : `${streak} days in a row`}</Text>
              </View>
              <View style={st.weekRow}>
                {week.map((d) => (
                  <View key={d.key} style={st.weekCol}>
                    <View style={[st.weekDot, d.on && st.weekDotOn, d.today && { borderColor: C.gold }]} />
                    <Text style={[st.weekLabel, d.today && { color: C.gold, fontWeight: '800' }]}>{d.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={st.hint}>Open the app each day to keep your streak going.</Text>
            </View>
          </ScrollView>
        )}

        {tab === 'library' && (
          <View style={{ flex: 1 }}>
            <View style={st.header}>
              <View style={{ flex: 1 }}>
                <Text style={[st.eyebrow, glow(C.violet, 8)]}>EXPLORE</Text>
                <Text style={st.h1}>Library</Text>
              </View>
            </View>
            <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.headerRule, { marginHorizontal: 20 }]} />
            <View style={st.segment}>
              {[['all', 'All quotes'], ['past', 'Past days']].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => setLibMode(k)} style={[st.segBtn, libMode === k && st.segOn]} accessibilityRole="button" accessibilityState={{ selected: libMode === k }}>
                  <Text style={[st.segText, libMode === k && { color: C.onNeon, fontWeight: '800' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {libMode === 'all' ? (
              <View style={{ flex: 1 }}>
                <View style={st.searchBox}>
                  <TextInput value={query} onChangeText={setQuery} placeholder="Search words, authors or topics" placeholderTextColor={C.muted}
                    style={st.searchInput} returnKeyType="search" accessibilityLabel="Search quotes" />
                  {query ? (
                    <TouchableOpacity onPress={() => setQuery('')} style={st.clearBtn} accessibilityRole="button"><Text style={st.link}>Clear</Text></TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.chipRow}>
                  {['All', ...CAT_NAMES].map((name) => {
                    const on = catFilter === name;
                    const color = name === 'All' ? C.diamond : CATS[name].color;
                    return (
                      <TouchableOpacity key={name} onPress={() => setCatFilter(name)} style={[st.chip, on && { backgroundColor: color, borderColor: color }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                        <Text style={[st.chipText, on && { color: C.onNeon, fontWeight: '800' }]}>{name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <FlatList
                  data={libItems} keyExtractor={(q) => q.id} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={<Text style={st.countText}>{libItems.length} {libItems.length === 1 ? 'quote' : 'quotes'}</Text>}
                  ListEmptyComponent={<View style={st.empty}><Text style={st.emptyTitle}>No matches</Text><Text style={st.emptyBody}>Try another word, author or topic.</Text></View>}
                  renderItem={({ item }) => (
                    <QuoteRow q={item} saved={favs.includes(item.id)} hasNote={!!notes[item.id]} photo={photoOf(item.author)} onPress={() => setDetail(item)} />
                  )}
                />
              </View>
            ) : (
              <FlatList
                data={pastDays} keyExtractor={(x) => x.id} contentContainerStyle={st.list}
                ListHeaderComponent={<Text style={st.countText}>Missed a day? Here are the last 14 daily quotes.</Text>}
                renderItem={({ item }) => (
                  <QuoteRow q={item.q} sub={shortLabel(item.date)} saved={favs.includes(item.q.id)} hasNote={!!notes[item.q.id]} photo={photoOf(item.q.author)} onPress={() => setDetail(item.q)} />
                )}
              />
            )}
          </View>
        )}

        {tab === 'saved' && (
          <View style={{ flex: 1 }}>
            <View style={st.header}>
              <View style={{ flex: 1 }}>
                <Text style={[st.eyebrow, glow(C.gold, 8)]}>{savedQuotes.length} {savedQuotes.length === 1 ? 'QUOTE' : 'QUOTES'}</Text>
                <Text style={st.h1}>Saved</Text>
              </View>
            </View>
            <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.headerRule, { marginHorizontal: 20 }]} />
            <FlatList
              data={savedQuotes} keyExtractor={(q) => q.id} contentContainerStyle={st.list}
              ListEmptyComponent={
                <View style={st.empty}>
                  <Text style={st.emptyTitle}>Nothing saved yet</Text>
                  <Text style={st.emptyBody}>Tap Save on any quote to keep it here, and add your own reflection.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <QuoteRow q={item} saved hasNote={!!notes[item.id]} photo={photoOf(item.author)} onPress={() => setDetail(item)} />
              )}
            />
          </View>
        )}

        {tab === 'settings' && (
          <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
            <View style={st.headerIn}>
              <View style={{ flex: 1 }}>
                <Text style={[st.eyebrow, glow(C.magenta, 8)]}>MAKE IT YOURS</Text>
                <Text style={st.h1}>Settings</Text>
              </View>
            </View>
            <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.headerRule} />

            <View style={st.panel}>
              <Text style={st.sectionTitle}>TOPICS</Text>
              <Text style={st.panelSub}>Choose what you want to read and be notified about.</Text>
              <View style={st.chipWrap}>
                {CAT_NAMES.map((name) => {
                  const on = settings.topics.includes(name);
                  const color = CATS[name].color;
                  return (
                    <TouchableOpacity key={name} onPress={() => toggleTopic(name)} style={[st.chip, on && { backgroundColor: color, borderColor: color }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[st.chipText, on && { color: C.onNeon, fontWeight: '800' }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {topicMsg ? <Text style={st.warnText}>{topicMsg}</Text> : null}
              <View style={st.setRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={st.setTitle}>Match quotes to the day</Text>
                  <Text style={st.setSub}>Sunday is Faith, Monday is Motivation, and so on.</Text>
                </View>
                <Toggle on={settings.smart} onPress={() => setSettings((s) => ({ ...s, smart: !s.smart }))} label="Match quotes to the day of the week" />
              </View>
            </View>

            <View style={st.panel}>
              <Text style={st.sectionTitle}>DAILY NOTIFICATION</Text>
              <View style={st.setRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={st.setTitle}>Daily quote notification</Text>
                  <Text style={st.setSub}>A pop-up with the quote of the day, at the time you choose.</Text>
                </View>
                <Toggle on={settings.notif.on} onPress={toggleNotif} label="Daily quote notification" />
              </View>
              {!Notifications ? <Text style={st.hint}>Notifications work in the installed app, not in Expo Go.</Text> : null}
              {settings.notif.on ? (
                <View>
                  <Text style={st.fieldLabel}>Time</Text>
                  <View style={st.chipWrap}>
                    {[[6, 0], [8, 0], [12, 0], [18, 0], [21, 0]].map(([h, m]) => {
                      const on = settings.notif.hour === h && settings.notif.minute === m;
                      return (
                        <TouchableOpacity key={h} onPress={() => { setTime(h, m); setShowIOSTime(false); }} style={[st.chip, on && st.chipOnCyan]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                          <Text style={[st.chipText, on && { color: C.onNeon, fontWeight: '800' }]}>{fmtTime(h, m)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {(() => {
                      const preset = [[6, 0], [8, 0], [12, 0], [18, 0], [21, 0]].some(([h, m]) => h === settings.notif.hour && m === settings.notif.minute);
                      return (
                        <TouchableOpacity onPress={pickCustomTime} style={[st.chip, !preset && st.chipOnCyan]} accessibilityRole="button">
                          <Text style={[st.chipText, !preset && { color: C.onNeon, fontWeight: '800' }]}>{preset ? 'Custom time' : fmtTime(settings.notif.hour, settings.notif.minute)}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                  {showIOSTime && Platform.OS === 'ios' ? (
                    <View>
                      <DateTimePicker
                        value={(() => { const d = new Date(); d.setHours(settings.notif.hour, settings.notif.minute, 0, 0); return d; })()}
                        mode="time" display="spinner" themeVariant="dark"
                        onChange={(_, d) => d && setTime(d.getHours(), d.getMinutes())}
                      />
                      <TouchableOpacity onPress={() => setShowIOSTime(false)} style={[st.linkBtn, { alignSelf: 'flex-end' }]}><Text style={st.link}>Done</Text></TouchableOpacity>
                    </View>
                  ) : null}
                  <Text style={st.statusLine}>
                    {scheduled > 0 ? `Next quote: ${nextWhen}` : scheduled === -1 ? 'Could not schedule. Check your notification permission.' : 'Setting up...'}
                  </Text>
                  <TouchableOpacity style={st.outlineBtn} onPress={sendTest} accessibilityRole="button">
                    <Text style={st.outlineText}>Send a test notification</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {notifMsg ? <Text style={[st.hint, { color: notifMsg.ok ? C.cyan : C.danger, fontWeight: '700' }]}>{notifMsg.text}</Text> : null}
            </View>

            <View style={st.panel}>
              <Text style={st.sectionTitle}>ABOUT</Text>
              <Text style={st.panelSub}>
                Quotes are stored on your device and work offline. Author photos and biographies load from Wikipedia when you are online. Scripture is from the King James Version.
              </Text>
            </View>
          </ScrollView>
        )}

        {snack ? (
          <View style={[st.snack, { bottom: TABBAR + insets.bottom + 12 }]}>
            <Text style={st.snackText}>{snack.message}</Text>
            {snack.onUndo ? (
              <TouchableOpacity onPress={undoSnack} style={st.snackBtn} accessibilityRole="button"><Text style={st.snackAction}>Undo</Text></TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={[st.tabs, { paddingBottom: insets.bottom }]}>
          {[['today', 'Today'], ['library', 'Library'], ['saved', 'Saved'], ['settings', 'Settings']].map(([k, label]) => (
            <TouchableOpacity key={k} style={st.tab} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              {tab === k ? <LinearGradient colors={NEON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.tabBar} /> : null}
              <Text style={[st.tabText, tab === k && [st.tabOn, glow(C.cyan, 8)]]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {detail ? (
          <View style={st.overlay}>
            <View style={st.detailTop}>
              <Text style={st.detailTitle}>Quote</Text>
              <TouchableOpacity onPress={() => setDetail(null)} style={st.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={st.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
              {renderView(detail, detail.cat.toUpperCase())}
            </ScrollView>
          </View>
        ) : null}

        {sharing ? (
          <View style={st.shareOverlay}>
            <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setSharing(null)} accessibilityLabel="Close share" />
            <View style={st.shareSheet}>
              <Text style={st.shareTitle}>Share this quote</Text>
              <View style={st.chipWrap}>
                {Object.keys(SHARE_STYLES).map((name) => {
                  const on = shareStyle === name;
                  return (
                    <TouchableOpacity key={name} onPress={() => setShareStyle(name)} style={[st.chip, on && st.chipOnCyan]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[st.chipText, on && { color: C.onNeon, fontWeight: '800' }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <View ref={cardRef} collapsable={false}>
                  <ShareCard q={sharing} variant={shareStyle} />
                </View>
              </View>
              <TouchableOpacity onPress={shareImage} disabled={shareBusy} accessibilityRole="button" style={{ opacity: shareBusy ? 0.6 : 1 }}>
                <LinearGradient colors={[C.cyan, '#6FA8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.primaryBtn}>
                  <Text style={st.primaryText}>{shareBusy ? 'Preparing image...' : 'Share as image'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={st.shareRow}>
                <TouchableOpacity style={st.ghostBtn} onPress={() => shareText(sharing)} accessibilityRole="button"><Text style={st.ghostText}>Share as text</Text></TouchableOpacity>
                <View style={{ width: 10 }} />
                <TouchableOpacity style={st.ghostBtn} onPress={() => setSharing(null)} accessibilityRole="button"><Text style={st.ghostText}>Close</Text></TouchableOpacity>
              </View>
              {shareMsg ? <Text style={[st.hint, { textAlign: 'center', color: shareMsg.ok ? C.cyan : C.danger, fontWeight: '700' }]}>{shareMsg.text}</Text> : null}
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </SafeAreaView>
  );
}

export { QUOTES, AUTHORS, WEEK_THEME, CAT_NAMES, DEFAULT_SETTINGS, dailyQuoteFor, calcStreak, dateKey, authorMeta };

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 14, marginBottom: 10 },
  headerIn: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 2.2, color: C.cyan },
  h1: { fontSize: 26, fontFamily: SERIF, fontWeight: '700', color: C.text, marginTop: 4 },
  headerRule: { height: 2, borderRadius: 1, marginBottom: 12 },
  themeLine: { fontSize: 13, color: C.muted, marginBottom: 14 },
  streakPill: { alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.gold, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(230,196,104,0.08)' },
  streakNum: { fontSize: 22, fontFamily: SERIF, fontWeight: '800', color: C.gold },
  streakLabel: { fontSize: 11, color: C.gold, fontWeight: '700', letterSpacing: 0.5 },

  cardGlow: { marginBottom: 16, shadowColor: C.cyan, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  cardBorder: { borderRadius: 26, padding: 1.5 },
  cardInner: { borderRadius: 24.5, backgroundColor: C.card, padding: 22, overflow: 'hidden' },
  facets: { position: 'absolute', top: -34, right: -34, width: 150, height: 150 },
  facet: { position: 'absolute', borderWidth: 1, transform: [{ rotate: '45deg' }] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: C.diamond },
  catPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginRight: 52 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  catText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  quoteMark: { fontSize: 64, lineHeight: 64, fontFamily: SERIF, color: C.gold, marginTop: 10, height: 48 },
  quoteText: { fontFamily: SERIF, color: C.text, fontWeight: '600' },
  neonRule: { height: 2, width: 72, borderRadius: 1, marginVertical: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: 18, fontFamily: SERIF, fontWeight: '700', color: C.ice },
  authorRole: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  aboutBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  aboutText: { fontSize: 14, fontWeight: '800', color: C.cyan },
  bioBox: { backgroundColor: C.card2, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 6 },
  bioText: { fontSize: 14, lineHeight: 21, color: C.text },
  actions: { flexDirection: 'row', marginTop: 12 },
  act: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.card2 },
  actOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  actText: { fontSize: 15, fontWeight: '800', color: C.ice },
  noteBox: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line },
  noteTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8, color: C.gold, marginBottom: 10 },
  noteInput: { minHeight: 76, textAlignVertical: 'top', backgroundColor: C.bg2, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, fontSize: 15, color: C.text },
  noteBtn: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.gold, marginTop: 10 },
  noteBtnText: { fontSize: 14, fontWeight: '800', color: C.gold },
  noteOk: { fontSize: 13, color: C.cyan, fontWeight: '700', marginTop: 8 },
  noteHint: { fontSize: 13, color: C.muted, marginTop: 16 },

  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  primaryBtn: { minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  primaryText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.4, color: C.onNeon },
  ghostBtn: { flex: 1, minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.card },
  ghostText: { fontSize: 16, fontWeight: '800', color: C.ice },
  linkBtn: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  link: { fontSize: 15, fontWeight: '800', color: C.cyan },

  streakCard: { marginTop: 14, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 18 },
  streakHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8, color: C.gold },
  streakText: { fontSize: 14, fontWeight: '800', color: C.ice, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', flex: 1 },
  weekDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.line, backgroundColor: 'transparent' },
  weekDotOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  weekLabel: { fontSize: 11, color: C.muted, marginTop: 6, fontWeight: '700' },
  hint: { fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 19 },

  segment: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 4, marginBottom: 10 },
  segBtn: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  segOn: { backgroundColor: C.cyan },
  segText: { fontSize: 15, color: C.muted, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingLeft: 16 },
  searchInput: { flex: 1, fontSize: 16, color: C.text, paddingVertical: 14 },
  clearBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  chipRow: { paddingHorizontal: 20, paddingBottom: 6, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.card2, borderRadius: 999, paddingHorizontal: 16, marginRight: 8, marginBottom: 8 },
  chipOnCyan: { backgroundColor: C.cyan, borderColor: C.cyan },
  chipText: { fontSize: 15, color: C.ice },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130 },
  countText: { fontSize: 13, color: C.muted, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  rowBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 14 },
  rowSub: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.gold, marginBottom: 6 },
  rowText: { fontSize: 16, lineHeight: 23, fontFamily: SERIF, color: C.text },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowAuthor: { fontSize: 13, color: C.muted, flexShrink: 1, marginRight: 10 },
  rowCat: { fontSize: 12, fontWeight: '800' },
  rowNote: { fontSize: 12, color: C.gold, fontWeight: '700', marginTop: 6 },
  rowSaved: { fontSize: 11, fontWeight: '800', color: C.cyan, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 36, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 20, fontFamily: SERIF, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22 },

  panel: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 18, marginBottom: 16 },
  panelSub: { fontSize: 14, color: C.muted, lineHeight: 20, marginTop: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: C.muted, marginTop: 16, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  setTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  setSub: { fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 18 },
  toggle: { width: 56, height: 32, borderRadius: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: C.cyan, borderColor: C.cyan },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.muted },
  knobOn: { backgroundColor: C.onNeon, alignSelf: 'flex-end' },
  warnText: { fontSize: 14, color: C.gold, fontWeight: '700', marginTop: 6 },
  statusLine: { fontSize: 14, color: C.cyan, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  outlineBtn: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: C.cyan },
  outlineText: { fontSize: 15, fontWeight: '800', color: C.cyan },

  snack: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card2, borderWidth: 1, borderColor: C.cyan, borderRadius: 14, paddingLeft: 18, paddingRight: 6, elevation: 8 },
  snackText: { fontSize: 15, color: C.text, fontWeight: '700' },
  snackBtn: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  snackAction: { fontSize: 15, fontWeight: '800', color: C.cyan },

  tabs: { flexDirection: 'row', backgroundColor: '#0A0C10', borderTopWidth: 1, borderTopColor: C.line },
  tab: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, color: C.muted, fontWeight: '700' },
  tabOn: { color: C.ice, fontWeight: '800' },
  tabBar: { position: 'absolute', top: 0, width: 36, height: 3, borderRadius: 2 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg },
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14 },
  detailTitle: { fontSize: 22, fontFamily: SERIF, fontWeight: '700', color: C.text },
  closeBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.card },
  closeText: { fontSize: 15, fontWeight: '800', color: C.ice },

  shareOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  shareSheet: { backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: C.lineStrong, padding: 20, paddingBottom: 28 },
  shareTitle: { fontSize: 22, fontFamily: SERIF, fontWeight: '700', color: C.text },
  shareRow: { flexDirection: 'row', marginTop: 10 },
  shareBorder: { width: 320, height: 320, borderRadius: 22, padding: 2 },
  shareInner: { flex: 1, borderRadius: 20, padding: 24, justifyContent: 'center' },
  shareCat: { fontSize: 11, fontWeight: '800', letterSpacing: 2.4, marginBottom: 12 },
  shareQuote: { fontFamily: SERIF, fontWeight: '600' },
  shareAuthor: { fontSize: 15, fontFamily: SERIF, fontWeight: '700' },
  shareBrand: { position: 'absolute', bottom: 16, right: 20, fontSize: 10, fontWeight: '800', letterSpacing: 2.4 },
});

