import type { Look } from "@/lib/aether";
/** Original layered vector artwork. Every wardrobe option is drawn in the same pose. */
export default function Character2D({
  look,
  id = "hero",
}: {
  look: Look;
  id?: string;
}) {
  const male = look.gender === "male",
    robe = look.style === "robe",
    plate = look.style === "plate";
  const ink = "#302c49",
    cream = "#f3e8d4";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 650"
      role="img"
      aria-label={`${look.gender} anime character wearing ${look.style}, ${look.hairstyle} hair and ${look.weapon}`}
    >
      <defs>
        <linearGradient id={`${id}-hair`} x2=".8" y2="1">
          <stop stopColor={look.hair} />
          <stop offset="1" stopColor={ink} />
        </linearGradient>
        <linearGradient id={`${id}-cloth`} x2=".7" y2="1">
          <stop stopColor={look.color} />
          <stop offset="1" stopColor={ink} />
        </linearGradient>
        <linearGradient id={`${id}-skin`} x2=".8" y2="1">
          <stop stopColor={look.skin} />
          <stop offset="1" stopColor="#d69c93" />
        </linearGradient>
      </defs>
      <g
        stroke={ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {look.wings && (
          <g fill={cream} stroke={look.trim} strokeWidth="2">
            {[-1, 1].map((s) => (
              <g key={s} transform={`translate(200 240) scale(${s} 1)`}>
                <path d="M15 5 Q95-100 160-75 Q155 0 75 65L28 75 Q80 24 125-15 Q80 25 15 30Z" />
                <path d="M42 10 137-56M47 23 129-30M40 43 106 0" fill="none" />
              </g>
            ))}
          </g>
        )}
        {/* Hair behind the shoulders. */}
        <path
          d={
            look.hairstyle === "long"
              ? "M140 111Q136 58 200 57Q263 60 262 121L278 330Q251 312 241 282L237 350 218 311 169 343 164 286Q150 323 124 324Z"
              : "M141 110Q134 58 202 57Q269 63 259 132L268 204Q239 199 235 179L161 184 131 205Z"
          }
          fill={`url(#${id}-hair)`}
        />
        {/* Legs, stockings, and fitted boots. */}
        <path
          d="M166 354 198 356 192 481 185 567 160 567 159 485Z M204 355 236 355 240 485 239 567 214 567 208 480Z"
          fill={`url(#${id}-skin)`}
        />
        <path
          d="M160 449 192 451 185 563 158 563Z M209 451 240 449 241 563 214 563Z"
          fill={plate ? "#46536d" : "#393346"}
        />
        <path
          d="M158 544 185 545 187 582Q178 595 151 590L147 578Z M214 545 241 544 253 578Q256 593 222 590L212 582Z"
          fill={ink}
        />
        <path
          d="m161 552 21 2m35 0 21-2M151 581l32 1m34 0 30-1"
          stroke={look.trim}
        />
        {/* Arms and hands, in a relaxed illustrated pose. */}
        <path
          d="M151 218Q134 220 130 253L111 343 102 375 104 393 113 391 123 371 128 347 157 272Z M249 218Q266 220 270 253L289 343 298 375 296 393 287 391 277 371 272 347 243 272Z"
          fill={`url(#${id}-skin)`}
        />
        <path
          d="m113 356 18 5-5 19-20-5Z M269 361l18-5 7 19-20 5Z"
          fill={look.color}
        />
        {/* Neck, blouse, coat and skirt / trousers. */}
        <path
          d="m184 174-1 28-20 14 36 45 40-45-22-14-1-28Z"
          fill={`url(#${id}-skin)`}
        />
        <path
          d={
            male
              ? "M164 210 182 200 199 215 218 200 237 209 255 275 236 300 242 376 203 385 198 344 192 385 155 376 164 301 144 274Z"
              : "M164 210 182 201 200 218 218 201 237 210 250 266 231 290 248 367Q199 388 150 367L169 290 150 265Z"
          }
          fill={`url(#${id}-cloth)`}
        />
        <path
          d="m180 201 20 17-17 26-17-31Z m40 0-20 17 17 26 17-31Z"
          fill={cream}
        />
        <path d="m200 220-8 14 8 22 8-22Z" fill={look.trim} />
        {male && (
          <path
            d="m159 371 35-1-2 77-33-1Z m45-1 37 1-1 75-31 1Z"
            fill={look.color}
          />
        )}
        {robe && (
          <>
            <path
              d="m160 211-28 34-6 190 55-18 18-164-15-45Z M240 211l28 34 6 190-55-18-18-164 15-45Z"
              fill={look.color}
            />
            <path
              d="m159 233-21 183 39-10m64-173 21 183-39-10"
              fill="none"
              stroke={cream}
              strokeWidth="5"
            />
            <path
              d="m156 215 43 45 45-45"
              fill="none"
              stroke={look.trim}
              strokeWidth="3"
            />
          </>
        )}
        {plate && (
          <>
            <path d="m164 244 35 10 36-10-8 53-28 17-28-17Z" fill={cream} />
            <path
              d="m174 252 25 14 26-14-7 36-19 13-19-13Z"
              fill={look.color}
            />
            <path
              d="M154 215 136 233 130 262 157 255 173 227Z M246 215l18 18 6 29-27-7-16-28Z"
              fill={cream}
            />
            <path
              d="m139 243 20-11m82 0 20 11"
              stroke={look.trim}
              strokeWidth="4"
            />
          </>
        )}
        {!robe && <path d="m164 298 69 0 2 14-72 0Z" fill="#59414b" />}
        <rect x="190" y="297" width="19" height="17" rx="3" fill={cream} />
        <path d="m196 301 7 0v9h-7Z" fill={look.trim} />
        {look.style === "ranger" && (
          <>
            <path d="m173 211 54 107" stroke="#5c4353" strokeWidth="12" />
            <rect
              x="224"
              y="310"
              width="35"
              height="37"
              rx="5"
              fill="#6d5060"
            />
            <path d="m234 314h16v11h-16Z" fill={cream} />
          </>
        )}
        {/* Face: shaded ears, tapered jaw and hand-drawn eye layers. */}
        <ellipse cx="145" cy="142" rx="9" ry="14" fill={look.skin} />
        <ellipse cx="255" cy="142" rx="9" ry="14" fill={look.skin} />
        <path
          d="M147 103Q151 73 200 73Q249 73 253 103L248 151Q238 177 200 191Q164 177 152 151Z"
          fill={`url(#${id}-skin)`}
        />
        <path
          d="M161 136Q174 125 188 136Q176 154 163 144Z M212 136Q225 125 239 136L237 144Q224 154 212 136Z"
          fill="#fff9f5"
          strokeWidth="1.4"
        />
        {[174, 226].map((x) => (
          <g key={x}>
            <ellipse
              cx={x}
              cy="139"
              rx="7.2"
              ry={male ? 9 : 10}
              fill={look.trim}
            />
            <ellipse
              cx={x}
              cy="140"
              rx="3.1"
              ry="6.5"
              fill={ink}
              stroke="none"
            />
            <ellipse
              cx={x - 2}
              cy="135"
              rx="2.7"
              ry="3"
              fill="white"
              stroke="none"
            />
            <circle cx={x + 2.5} cy="143" r="1.3" fill="white" stroke="none" />
          </g>
        ))}
        <path
          d="M159 134q14-9 30 2m22 0q16-11 30-2"
          fill="none"
          strokeWidth={male ? 2.8 : 3.6}
        />
        <path
          d="m159 134-4-3m86 3 4-3M162 121q11-6 22-1m32 0q11-5 22 1"
          fill="none"
          stroke={look.hair}
        />
        <path
          d="m200 143-3 11 5 1"
          fill="none"
          stroke="#b57f7f"
          strokeWidth="1.2"
        />
        <path
          d="M191 168q9 5 18-1"
          fill="none"
          stroke="#9d606e"
          strokeWidth="1.7"
        />
        <ellipse
          cx="165"
          cy="155"
          rx="9"
          ry="3"
          fill="#ec9da2"
          stroke="none"
          opacity=".35"
        />
        <ellipse
          cx="235"
          cy="155"
          rx="9"
          ry="3"
          fill="#ec9da2"
          stroke="none"
          opacity=".35"
        />
        {/* Layered fringe with curved locks instead of a hard cut. */}
        <path
          d="M144 131Q126 90 154 68Q194 40 234 65Q268 79 256 134L245 117 235 89Q233 112 212 127L215 97Q201 120 182 127L185 100Q173 121 155 130L158 105Z"
          fill={`url(#${id}-hair)`}
        />
        <path
          d="M156 88q19-23 42-22m-28 28q17-18 31-19m15-7q19 6 27 24"
          stroke={look.hair}
          strokeWidth="5"
          fill="none"
          opacity=".8"
        />
        {look.hairstyle === "crest" && (
          <>
            <path
              d="M147 99q53-61 106 0"
              fill="none"
              stroke={cream}
              strokeWidth="5"
            />
            <path d="m194 70 6-10 6 10-6 10Z" fill={look.trim} />
          </>
        )}
        {/* Weapons remain separate wardrobe layers. */}
        {look.weapon === "staff" ? (
          <g>
            <path d="M91 224v323" stroke="#654953" strokeWidth="8" />
            <circle
              cx="91"
              cy="205"
              r="27"
              fill="none"
              stroke={cream}
              strokeWidth="5"
            />
            <path d="m91 186 15 19-15 20-15-20Z" fill={look.trim} />
            <path d="m91 190 0 29" stroke="white" opacity=".5" />
          </g>
        ) : (
          <g>
            {(look.weapon === "blades" ? [-1, 1] : [1]).map((s) => (
              <g
                key={s}
                transform={`translate(${s === 1 ? 290 : 108} 374) rotate(${s === 1 ? -12 : 12})`}
              >
                <path d="m-5-15 0-125 5-24 5 24 0 125Z" fill={cream} />
                <path d="M0-146v127" stroke={look.trim} />
                <path d="M-17-14h34v7h-34Z" fill="#b8a67c" />
                <path d="M-4-7h8v30h-8Z" fill="#624556" />
                <circle cy="26" r="5" fill={look.trim} />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
