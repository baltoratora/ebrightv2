// "Quote of the day" — a curated, globally diverse set of famous quotes on
// science, discovery, innovation and the life of the mind. Bundled locally (no
// external API) so attribution stays accurate and the card never fails to load.
//
// Pure selection logic lives here and is unit-tested; the client component only
// maps the chosen index to a quote. `origin` is the author's background, kept so
// the set visibly spans the whole world rather than one tradition.

export interface Quote {
  text: string;
  author: string;
  origin?: string;
}

export const QUOTES: Quote[] = [
  {
    text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.",
    author: "Albert Einstein",
    origin: "German-American",
  },
  {
    text: "Imagination is more important than knowledge.",
    author: "Albert Einstein",
    origin: "German-American",
  },
  {
    text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.",
    author: "Marie Curie",
    origin: "Polish-French",
  },
  {
    text: "If I have seen further it is by standing on the shoulders of giants.",
    author: "Isaac Newton",
    origin: "English",
  },
  {
    text: "The present is theirs; the future, for which I really worked, is mine.",
    author: "Nikola Tesla",
    origin: "Serbian-American",
  },
  {
    text: "The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves.",
    author: "Ada Lovelace",
    origin: "English",
  },
  {
    text: "We are made of star-stuff.",
    author: "Carl Sagan",
    origin: "American",
  },
  {
    text: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    origin: "American",
  },
  {
    text: "The first principle is that you must not fool yourself — and you are the easiest person to fool.",
    author: "Richard Feynman",
    origin: "American",
  },
  {
    text: "The most dangerous phrase in the language is, “We've always done it this way.”",
    author: "Grace Hopper",
    origin: "American",
  },
  {
    text: "A ship in port is safe, but that is not what ships are built for.",
    author: "Grace Hopper",
    origin: "American",
  },
  {
    text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    origin: "English",
  },
  {
    text: "Look up at the stars and not down at your feet. Try to make sense of what you see, and wonder about what makes the universe exist.",
    author: "Stephen Hawking",
    origin: "English",
  },
  {
    text: "Science and everyday life cannot and should not be separated.",
    author: "Rosalind Franklin",
    origin: "English",
  },
  {
    text: "Like what you do, and then you will do your best.",
    author: "Katherine Johnson",
    origin: "American",
  },
  {
    text: "The seeker after truth makes himself an enemy of all that he reads, and questions what it tells him.",
    author: "Ibn al-Haytham (Alhazen)",
    origin: "Arab, Basra",
  },
  {
    text: "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.",
    author: "A. P. J. Abdul Kalam",
    origin: "Indian",
  },
  {
    text: "An equation for me has no meaning unless it expresses a thought of God.",
    author: "Srinivasa Ramanujan",
    origin: "Indian",
  },
  {
    text: "Ask the right questions, and nature will open the doors to her secrets.",
    author: "C. V. Raman",
    origin: "Indian",
  },
  {
    text: "Give me a place to stand, and I shall move the earth.",
    author: "Archimedes",
    origin: "Greek",
  },
  {
    text: "There is only one thing worse than coming home from the lab to a sink full of dirty dishes, and that is not going to the lab at all.",
    author: "Chien-Shiung Wu",
    origin: "Chinese-American",
  },
  {
    text: "Never be limited by other people's limited imaginations.",
    author: "Mae Jemison",
    origin: "American",
  },
  {
    text: "Anything will give up its secrets if you love it enough.",
    author: "George Washington Carver",
    origin: "American",
  },
  {
    text: "Genius is one percent inspiration and ninety-nine percent perspiration.",
    author: "Thomas Edison",
    origin: "American",
  },
  {
    text: "Learning never exhausts the mind.",
    author: "Leonardo da Vinci",
    origin: "Italian",
  },
  {
    text: "In the fields of observation chance favors only the prepared mind.",
    author: "Louis Pasteur",
    origin: "French",
  },
  {
    text: "An expert is a person who has made all the mistakes that can be made in a very narrow field.",
    author: "Niels Bohr",
    origin: "Danish",
  },
  {
    text: "The universe is not only queerer than we suppose, but queerer than we can suppose.",
    author: "J. B. S. Haldane",
    origin: "British-Indian",
  },
  {
    text: "Discovery consists of seeing what everybody has seen and thinking what nobody has thought.",
    author: "Albert Szent-Györgyi",
    origin: "Hungarian",
  },
  {
    text: "If you know you are on the right track, if you have this inner knowledge, then nobody can turn you off, no matter what they say.",
    author: "Barbara McClintock",
    origin: "American",
  },
  {
    text: "Every individual matters. Every individual has a role to play. Every individual makes a difference.",
    author: "Jane Goodall",
    origin: "English",
  },
  {
    text: "The good thing about science is that it's true whether or not you believe in it.",
    author: "Neil deGrasse Tyson",
    origin: "American",
  },
  {
    text: "You never change things by fighting the existing reality. To change something, build a new model that makes the existing model obsolete.",
    author: "Buckminster Fuller",
    origin: "American",
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    origin: "American",
  },
  {
    text: "The future is still so much bigger than the past.",
    author: "Tim Berners-Lee",
    origin: "British",
  },
  {
    text: "Science progresses best when observations force us to alter our preconceptions.",
    author: "Vera Rubin",
    origin: "American",
  },
  {
    text: "Simplicity is a prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
    origin: "Dutch",
  },
  {
    text: "Premature optimization is the root of all evil.",
    author: "Donald Knuth",
    origin: "American",
  },
  {
    text: "I was merely thinking God's thoughts after him.",
    author: "Johannes Kepler",
    origin: "German",
  },
  {
    text: "It's the little things citizens do. That's what will make the difference.",
    author: "Wangari Maathai",
    origin: "Kenyan",
  },
  {
    text: "Science is fun. Science is curiosity.",
    author: "Sally Ride",
    origin: "American",
  },
  {
    text: "Real knowledge is to know the extent of one's ignorance.",
    author: "Confucius",
    origin: "Chinese",
  },
  {
    text: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
    origin: "Chinese",
  },
  {
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    origin: "Finnish-American",
  },
  {
    text: "Nothing is too wonderful to be true, if it be consistent with the laws of nature.",
    author: "Michael Faraday",
    origin: "English",
  },
  {
    text: "Errors using inadequate data are much less than those using no data at all.",
    author: "Charles Babbage",
    origin: "English",
  },
  {
    text: "I just wondered how things were put together.",
    author: "Claude Shannon",
    origin: "American",
  },
  {
    text: "I attribute my success to this: I never gave or took any excuse.",
    author: "Florence Nightingale",
    origin: "English",
  },
  {
    text: "In nature nothing exists alone.",
    author: "Rachel Carson",
    origin: "American",
  },
  {
    text: "The most exciting phrase to hear in science, the one that heralds new discoveries, is not “Eureka” but “That's funny...”",
    author: "Isaac Asimov",
    origin: "Russian-American",
  },
  {
    text: "I was captured for life by chemistry and by crystals.",
    author: "Dorothy Hodgkin",
    origin: "English",
  },
  {
    text: "The pursuit of science has often been compared to the scaling of mountains, high and not so high.",
    author: "Subrahmanyan Chandrasekhar",
    origin: "Indian-American",
  },
];

/**
 * Index into the quote list for a given day. Stable within a day, rotates
 * daily, wraps the list, and is safe for negative or fractional inputs.
 */
export function indexForDay(dayIndex: number, len: number): number {
  const d = Math.floor(dayIndex);
  return ((d % len) + len) % len;
}

/**
 * A list index that is never `current`, derived deterministically from a random
 * value in [0, 1). Used by the refresh button to surface a different quote.
 */
export function randomIndexExcluding(
  current: number,
  len: number,
  rnd: number,
): number {
  if (len <= 1) return 0;
  let i = Math.floor(rnd * (len - 1));
  if (i > len - 2) i = len - 2; // guard a theoretical rnd === 1
  if (i >= current) i += 1;
  return i;
}

/** The quote of the day for a given day index (e.g. days since the epoch). */
export function quoteForDay(dayIndex: number): Quote {
  return QUOTES[indexForDay(dayIndex, QUOTES.length)];
}
