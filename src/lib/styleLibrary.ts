// 这份风格库直接来自参考 skill（codex-ppt）自带的 references/*.md 12 份内置风格文件，
// 逐字保留每份文件里的 GPT-Image-2 风格 Brief JSON（不重写、不转述、不精简），
// 目的是让生成质量尽量贴近 skill 本身——skill 的风格是人工精心写好的、精确到十六进制色值和具体版式规则的 JSON，
// 比让 AI 每次临场生成一段自然语言风格描述更可靠。
// 数据来源：codex-ppt-skill references/ 目录，MIT License，Copyright (c) 2026 ningzimu
// https://github.com/ningzimu/codex-ppt-skill

export interface BuiltinSlideStyle {
  name: string
  scenarios: string[]
  brief: Record<string, unknown>
}

export const BUILTIN_SLIDE_STYLES: BuiltinSlideStyle[] = [
  {
    "name": "党政红风格",
    "scenarios": [
      "党政机关工作汇报、专题学习与会议材料",
      "政策宣讲、党建活动、年度总结与重点工作部署",
      "国企、事业单位和公共服务机构的正式汇报"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "党政红风格",
      "best_for": "党政机关、国企和事业单位的工作汇报、政策宣讲、党建学习、年度总结与重点工作部署",
      "visual_direction": "solemn, authoritative, and optimistic Chinese public-sector presentation with a recognizable Chinese-red identity, restrained gold accents, strong Chinese typography, and a visual expression shaped by the subject rather than a fixed ceremonial layout",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "choose red, warm ivory, a restrained gradient, a relevant photograph, or a subtle abstract treatment according to the page role and subject; any landscape, architecture, ribbon, skyline, or cultural motif is optional and must serve the content rather than become a default background",
        "composition": "formal and balanced with a prominent title hierarchy and disciplined alignment; allow centered, asymmetric, image-led, modular, or spacious compositions when they better express the content",
        "density": "medium information density with controlled whitespace, clear reading order, and enough supporting text or evidence to make each page useful"
      },
      "color_palette": {
        "primary": "Chinese red #C41E3A for main titles, structural emphasis, and key labels",
        "secondary": "deep red #9E1530 for contrast and warm ivory #FFF9F2 for the main canvas",
        "accent": "restrained matte gold #D6A84B and warm amber #E9A11B for icons, connectors, and small title ornaments",
        "neutral": "ink black #262626, dark gray #4A4A4A, pale warm gray #F3EEE7",
        "rule": "use Chinese red to establish authority and gold as a restrained accent. Balance red, warm ivory, and neutral space according to page role; avoid glitter, glossy gradients, and festive red-and-gold decoration"
      },
      "typography": {
        "title": "large bold Microsoft YaHei or Source Han Sans style Chinese sans-serif, visually strong, dignified, and immediately noticeable",
        "body": "Microsoft YaHei or Source Han Sans style Chinese sans-serif, concise, highly readable, and aligned to a strict grid",
        "labels": "bold white or dark-red text on restrained red or pale-gold blocks",
        "text_quality": "all Chinese text must be exact, fully legible, non-garbled, and suitable for formal government reporting"
      },
      "title_system": {
        "consistency_rule": "Keep the title hierarchy, typeface, weight, color logic, and spacing consistent across slides of the same page type.",
        "cover": "Use a prominent, dignified title treatment that may be centered, offset, or integrated with a relevant visual according to the composition.",
        "section_divider": "Use a concise title and a clear transition in scale, color, whitespace, or imagery without requiring a fixed navigation bar or ornament.",
        "content_slide": "Keep the page topic immediately recognizable, but align the title with the composition and information structure; centered and left-aligned treatments are both valid.",
        "flexibility": "Treat the title system as a hierarchy and consistency rule, not a fixed arrangement. Do not require a navigation strip, centered title, gold separator, numbering style, or identical decoration on every slide."
      },
      "layout_patterns": [
        "cover or opener with a dominant title and a subject-relevant photographic, illustrative, architectural, landscape, or abstract visual",
        "section divider with a concise statement and a clear transition created through scale, whitespace, color, or imagery",
        "content explanation organized around the most important relationship, argument, process, comparison, or evidence",
        "work deployment or policy interpretation page whose modules, sequence, and emphasis follow the source content",
        "achievement or data page combining key figures, charts, images, and evidence-based captions as needed",
        "summary or closing page that reinforces the central message with a strong but restrained visual conclusion"
      ],
      "layout_usage_rule": "Keep the red-led identity, typography, and formal tone consistent while varying title placement, background treatment, imagery, information structure, and whitespace by page purpose. Do not force every slide into the same grid, module count, title position, or decorative motif; use lighter backgrounds when they improve readability.",
      "layout_blueprints": [
        {
          "name": "封面 / 开场",
          "sections": [
            {
              "position": "primary visual field",
              "count": 1,
              "labels": [
                "prominent title and concise supporting information"
              ]
            },
            {
              "position": "supporting field",
              "count": 1,
              "labels": [
                "optional subject-relevant photograph, illustration, architecture, landscape, or abstract visual"
              ]
            }
          ]
        },
        {
          "name": "信息阐释 / 工作部署",
          "sections": [
            {
              "position": "title zone",
              "count": 1,
              "labels": [
                "clear page topic or guiding statement"
              ]
            },
            {
              "position": "main content field",
              "count": 1,
              "labels": [
                "the dominant argument, relationship, process, comparison, or evidence structure"
              ]
            },
            {
              "position": "supporting field",
              "count": 1,
              "labels": [
                "supporting text, data, images, or callouts selected according to the source"
              ]
            }
          ]
        },
        {
          "name": "成果 / 总结",
          "sections": [
            {
              "position": "primary message field",
              "count": 1,
              "labels": [
                "central conclusion, achievement, or call to action"
              ]
            },
            {
              "position": "evidence field",
              "count": 1,
              "labels": [
                "figures, chart, comparison, documentary image, or concise supporting points as appropriate"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "content-relevant photography, illustrations, landscapes, architecture, skylines, public-service scenes, people, abstract ribbons or color fields, restrained red-and-gold accents, formal information modules, simple icons, clean charts, and subtle cultural motifs; none of these elements is mandatory",
        "avoid": "repeating the same landmark or ornament without content justification, invented or inaccurate official marks, excessive ceremonial decoration, thick shadows, glossy 3D text, glitter, festival or wedding motifs, cartoon styling, unrelated stock imagery, and decorative elements that compete with the message"
      },
      "image_treatment": {
        "photos": "use relevant and credible documentary, landscape, architectural, public-service, or institutional imagery; it may be full-bleed, cropped, framed, or integrated with a restrained red treatment, but avoid heavy filters that obscure the subject",
        "screenshots": "place inside clean warm-white frames with short source labels and no ornamental clutter",
        "charts": "use red as the primary series, gold for one key highlight, and neutral gray for comparison; keep labels direct and readable",
        "illustrations": "choose a flat, graphic, painterly, or restrained symbolic treatment according to the subject; do not impose a fixed landmark, ribbon, skyline, or landscape motif",
        "official_symbols": "use a party emblem, national emblem, flag, seal, or other official symbol only when the content genuinely requires it and an accurate, authorized source asset is available; never invent, approximate, or redesign official symbols"
      },
      "rendering_constraints": [
        "The slide must look like a formal Chinese government or public-sector report, not a festival poster or commercial advertisement.",
        "Use large, dignified Chinese sans-serif typography resembling Microsoft YaHei or Source Han Sans.",
        "Follow a consistent title system across slides of the same page type, while allowing cover, section-divider, and content-slide variants.",
        "Let the page role and source content determine title placement, background, imagery, module count, and composition.",
        "Do not force a navigation strip, centered title, gold separator, landscape, Great Wall, skyline, ribbon, or other specific motif onto every slide.",
        "Use Chinese red #C41E3A as the main red and gold as a restrained supporting accent.",
        "Keep gold restrained and matte; do not use glossy metallic or embossed 3D text.",
        "Use exact readable Chinese text and a clear top-to-bottom or left-to-right hierarchy.",
        "Do not invent, approximate, or redesign official marks, government logos, party emblems, national emblems, seals, flags, or institutional names.",
        "No watermark and no unrelated logo."
      ]
    }
  },
  {
    "name": "创意杂志风",
    "scenarios": [
      "创意提案",
      "品牌展示",
      "设计作品集",
      "文化活动",
      "时尚发布",
      "艺术展览",
      "创意工作室介绍"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "创意杂志风",
      "best_for": "需要强视觉记忆点、品牌个性或传播感的分享型演示",
      "visual_direction": "high-end editorial magazine spread, bold asymmetry, art-directed composition, graphic tension, premium creative layout",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "white, black, or deep charcoal with intentional negative space",
        "composition": "asymmetric editorial layout with a large headline, image/collage zone, and 2-3 supporting text blocks",
        "density": "strong contrast between dense editorial blocks and open whitespace"
      },
      "color_palette": {
        "base": "black, white, and gray",
        "accent": "one vivid accent such as neon pink #FF006E, lemon yellow #FFED00, or electric cyan #00F5FF",
        "support": "optional lavender, coral, or muted fashion tones",
        "rule": "use one dominant accent color consistently; do not make the palette chaotic"
      },
      "typography": {
        "title": "oversized bold display sans-serif or editorial serif, can occupy 25-45% of the slide",
        "body": "small clean sans-serif blocks with strong alignment",
        "emphasis": "keywords may use accent color, rotated labels, vertical text, or extreme scale contrast",
        "text_quality": "Chinese headline and key points must be exact and readable"
      },
      "layout_patterns": [
        "oversized headline on one side with collage or abstract image block on the other",
        "diagonal color block cutting across the slide",
        "magazine cover style with title, subtitle, and three feature teasers",
        "editorial grid with one large image crop and small annotation labels"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "editorial hero spread",
          "sections": [
            {
              "position": "left 45%",
              "count": 1,
              "labels": [
                "oversized headline"
              ]
            },
            {
              "position": "right 55%",
              "count": 1,
              "labels": [
                "collage or abstract image zone"
              ]
            },
            {
              "position": "bottom-left",
              "count": 3,
              "labels": [
                "feature teaser 1",
                "feature teaser 2",
                "feature teaser 3"
              ]
            }
          ]
        },
        {
          "name": "cover story grid",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "large cover title"
              ]
            },
            {
              "position": "center",
              "count": 2,
              "labels": [
                "main visual block",
                "accent typography block"
              ]
            },
            {
              "position": "right edge",
              "count": 3,
              "labels": [
                "short editorial callouts"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "bold geometric blocks, cropped photography zones, halftone texture, thin rules, torn-paper collage edges, accent stickers, abstract shapes",
        "avoid": "generic corporate icons, overly symmetrical layout, low-contrast text, too many accent colors"
      },
      "rendering_constraints": [
        "The slide should feel designed, not templated.",
        "Maintain legibility despite bold composition.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "复古扁平插画风",
    "scenarios": [
      "文化创意项目展示",
      "品牌故事讲述",
      "旅游景点介绍",
      "复古产品发布",
      "艺术设计作品集",
      "创意活动宣传",
      "生活方式类演示"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "复古扁平插画风",
      "best_for": "文化创意、品牌故事、生活方式、城市旅游和带叙事感的主题演示",
      "visual_direction": "retro flat vector illustration slide, cream paper texture, monoline black outlines, vintage palette, playful handcrafted design",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "cream/off-white paper #F5F3E8 with subtle grain",
        "composition": "panoramic illustration band plus structured content cards or labels",
        "density": "moderate, decorative but still clear"
      },
      "color_palette": {
        "base": "cream background and dark slate text #34495E",
        "vintage_colors": "coral red #FF6B6B, mint green #95E1D3, mustard yellow #F9CA24, burnt orange #E17055, slate blue #6C7A89",
        "line": "uniform black or deep charcoal outline",
        "rule": "flat fills only, no glossy 3D, no heavy gradients"
      },
      "typography": {
        "title": "bold retro serif or chunky vintage display type",
        "body": "geometric sans-serif, clear and friendly",
        "labels": "small badge labels with outlined shapes",
        "text_quality": "Chinese text must be exact and readable"
      },
      "layout_patterns": [
        "top panoramic flat illustration with bottom content cards",
        "central retro title with three outlined icon cards",
        "2.5D simplified scene with callout labels",
        "vintage poster composition adapted to presentation readability"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "panoramic illustration plus cards",
          "sections": [
            {
              "position": "top third",
              "count": 1,
              "labels": [
                "panoramic flat vector illustration"
              ]
            },
            {
              "position": "middle",
              "count": 1,
              "labels": [
                "large retro title"
              ]
            },
            {
              "position": "bottom",
              "count": 3,
              "labels": [
                "outlined content card 1",
                "outlined content card 2",
                "outlined content card 3"
              ]
            }
          ]
        },
        {
          "name": "retro poster diagram",
          "sections": [
            {
              "position": "center",
              "count": 1,
              "labels": [
                "main simplified scene or object"
              ]
            },
            {
              "position": "around center",
              "count": 4,
              "labels": [
                "callout label",
                "badge",
                "mini icon",
                "decorative note"
              ]
            },
            {
              "position": "bottom-right",
              "count": 1,
              "labels": [
                "summary plaque"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "flat vector scenes, 2-3px monoline outlines, simplified buildings, plants, clouds, badges, dotted textures, small geometric decorations",
        "avoid": "photorealism, complex shadows, neon palette, overly detailed linework, unreadable decorative type"
      },
      "rendering_constraints": [
        "The slide should feel like a polished retro illustration system, not a random cartoon.",
        "Maintain consistent outline weight across objects.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "手绘技术解释风",
    "scenarios": [
      "中文技术文章配图",
      "技术概念解释",
      "课程课件",
      "知识卡片",
      "产品机制说明",
      "AI / 软件工程主题分享",
      "需要降低理解门槛的复杂概念"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "手绘技术解释风",
      "best_for": "中文技术文章、课程课件、复杂概念解释、知识卡片和软件工程/AI 主题的低压力说明图",
      "visual_direction": "clean Chinese handdrawn technical explainer, near-white paper background, thin sketch lines, light pencil hatching, small precise central diagram, restrained pastel markers, lots of whitespace, calm educational tone",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "near-white paper #FCFBF7, not yellow, no full-page border",
        "composition": "small central explanatory diagram with sparse labels, surrounding whitespace, short title and minimal visible text",
        "density": "low to moderate; one core idea per slide; avoid dense whiteboard clutter"
      },
      "color_palette": {
        "line": "soft graphite #2F3437 or dark gray ink, thin and slightly irregular",
        "accent": "pale blue #BFD7F1, sage green #CFE2D1, light peach #F4C7B8, pale lavender #D8C7EF",
        "background": "near-white, clean, not kraft, not cream-heavy",
        "rule": "pastel marks are used for emphasis only; keep the page calm and airy"
      },
      "typography": {
        "title": "restrained handwritten Chinese title, medium-large but not poster-sized",
        "body": "short handwritten Chinese labels, few words per label, easy to inspect",
        "emphasis": "light underline, small bracket, soft marker highlight, or tiny note tag",
        "text_quality": "Chinese text must be exact, sparse, and readable; avoid long paragraphs"
      },
      "layout_patterns": [
        "central concept diagram with 3-4 short surrounding labels",
        "before-after explanation with two small sketch panels",
        "flow diagram with 3 steps and minimal arrows",
        "mental model page with one metaphor object and short annotations",
        "matrix or decision guide with sparse handwritten notes",
        "summary page with one small character or object and three takeaway labels"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; keep visual DNA stable while varying archetypes such as metaphor, process, comparison, matrix, and summary. Avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "small central concept map",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "short handwritten title"
              ]
            },
            {
              "position": "center",
              "count": 1,
              "labels": [
                "small precise concept diagram"
              ]
            },
            {
              "position": "around center",
              "count": 4,
              "labels": [
                "label 1",
                "label 2",
                "label 3",
                "label 4"
              ]
            },
            {
              "position": "bottom-right",
              "count": 1,
              "labels": [
                "one-sentence takeaway"
              ]
            }
          ]
        },
        {
          "name": "technical before-after",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "short page title"
              ]
            },
            {
              "position": "left",
              "count": 1,
              "labels": [
                "before sketch panel"
              ]
            },
            {
              "position": "right",
              "count": 1,
              "labels": [
                "after sketch panel"
              ]
            },
            {
              "position": "between panels",
              "count": 1,
              "labels": [
                "thin handdrawn arrow"
              ]
            },
            {
              "position": "bottom",
              "count": 3,
              "labels": [
                "why it matters",
                "tradeoff",
                "next step"
              ]
            }
          ]
        },
        {
          "name": "one idea teaching card",
          "sections": [
            {
              "position": "center-left",
              "count": 1,
              "labels": [
                "metaphor object or tiny engineer/reader character"
              ]
            },
            {
              "position": "center-right",
              "count": 3,
              "labels": [
                "core idea",
                "common mistake",
                "useful rule"
              ]
            },
            {
              "position": "background",
              "count": 1,
              "labels": [
                "very light pencil hatching and pastel highlight"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "thin handdrawn arrows, small diagrams, pencil hatching, pastel marker blocks, bracket notes, simple software/AI icons, tiny engineer or reader character at most once",
        "avoid": "messy whiteboard frame, marker tray, large cartoon characters, dense handwriting, yellowed paper, decorative stickers, poster-scale title, full-page border, digital UI cards"
      },
      "rendering_constraints": [
        "The slide should feel like a calm handdrawn technical article illustration, not a brainstorming whiteboard.",
        "Keep the central drawing small and precise with generous empty space.",
        "Use minimal Chinese text and make every visible word correct.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "手绘白板风",
    "scenarios": [
      "教学讲解",
      "培训课程",
      "头脑风暴",
      "概念说明",
      "技术分享",
      "内部研讨"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "手绘白板风",
      "best_for": "概念解释、技术分享、培训课程和需要亲和力的思路拆解",
      "visual_direction": "realistic whiteboard explanation slide, marker handwriting, sketched diagrams, friendly teaching atmosphere, authentic whiteboard details",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "warm off-white whiteboard surface #FAFAF5 with subtle marker smudges",
        "composition": "freeform but organized whiteboard layout with title, three concept blocks, arrows, and small doodle illustrations",
        "density": "moderate, readable, brainstorming feel without chaos"
      },
      "color_palette": {
        "primary": "black marker for main text",
        "accent": "red #E74C3C, blue #3498DB, orange #F39C12 marker annotations",
        "support": "green #27AE60, purple #9B59B6, yellow sticky note #FFF9C4",
        "rule": "colors should look like real marker ink, not digital neon"
      },
      "typography": {
        "title": "large neat handwritten Chinese marker style",
        "body": "clear handwritten marker text, slightly irregular but readable",
        "emphasis": "circle, underline, boxed words, sticky-note comments",
        "text_quality": "Chinese handwriting must remain accurate and legible"
      },
      "layout_patterns": [
        "three hand-drawn boxes connected by arrows",
        "central concept bubble with surrounding notes",
        "simple process diagram with sketches and annotations",
        "left explanation list plus right hand-drawn diagram"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "whiteboard process diagram",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "handwritten title"
              ]
            },
            {
              "position": "center",
              "count": 3,
              "labels": [
                "step 1 box",
                "step 2 box",
                "step 3 box"
              ]
            },
            {
              "position": "between boxes",
              "count": 2,
              "labels": [
                "hand-drawn arrow",
                "hand-drawn arrow"
              ]
            },
            {
              "position": "right edge",
              "count": 1,
              "labels": [
                "sticky-note takeaway"
              ]
            }
          ]
        },
        {
          "name": "concept map",
          "sections": [
            {
              "position": "center",
              "count": 1,
              "labels": [
                "main concept bubble"
              ]
            },
            {
              "position": "around center",
              "count": 4,
              "labels": [
                "supporting idea",
                "risk note",
                "example sketch",
                "action item"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "underlined summary"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "whiteboard frame, marker tray, colored markers, arrows, boxes, clouds, sticky notes, doodle icons, underlines, circled keywords",
        "avoid": "messy illegible handwriting, childish clutter, photoreal people, digital UI cards"
      },
      "rendering_constraints": [
        "The slide should look like a real whiteboard captured cleanly for a presentation.",
        "Keep all Chinese text readable despite handwritten style.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "教学课件风",
    "scenarios": [
      "高校课程、专题讲座与课堂教学",
      "技术培训、知识科普与专业能力建设",
      "概念讲解、体系梳理、案例分析与研究进展介绍",
      "需要同时呈现文字、图解、图片和数据的教学型演示"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "教学课件风",
      "best_for": "高校课程、专题讲座、技术培训、知识科普、概念讲解、体系梳理、案例分析和研究进展介绍",
      "visual_direction": "clear and credible academic courseware with structured knowledge communication, evidence-supported explanation, discipline-appropriate visuals, and a professional classroom tone shaped by the lesson rather than a fixed technical template",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "white or very light cool gray with restrained pale-blue structural accents",
        "composition": "structured teaching slide with a clear title hierarchy and a content-driven combination of text, images, diagrams, charts, formulas, source material, annotations, or comparisons selected according to the lesson objective",
        "density": "balanced teaching density: substantial enough to support explanation, but never sparse, paragraph-heavy, or crowded; use strong grouping, alignment, and readable whitespace"
      },
      "color_palette": {
        "primary": "deep academic navy #0B2E6D and clear blue #1769AA",
        "secondary": "light blue #EAF3FB and cool gray #F3F6F9",
        "accent": "choose a small set of restrained auxiliary colors according to the subject matter, source material, and semantic categories",
        "neutral": "ink black #1F2937, body gray #4B5563, border gray #D7E0EA",
        "rule": "use the blue system to establish the teaching structure; select auxiliary colors only when the content needs semantic distinction, then apply them consistently rather than decoratively"
      },
      "typography": {
        "title": "large bold Chinese sans-serif resembling Microsoft YaHei or Source Han Sans, usually dark navy, concise and immediately readable",
        "body": "compact but readable Chinese sans-serif with clear indentation and short explanatory phrases",
        "labels": "bold short labels with strong contrast, used when hierarchy or semantic categories need clarification rather than as mandatory card decoration",
        "text_quality": "all Chinese text, Latin terms, formulas, units, and data labels must be exact, readable, and non-garbled"
      },
      "title_system": {
        "consistency_rule": "Keep title typeface, weight, color logic, alignment, and spacing consistent across slides of the same page type.",
        "cover": "May combine a large course title with one or more subject-relevant visuals and concise presenter or course information; choose the visual structure according to the discipline and topic.",
        "section_divider": "May use a concise section title with stronger whitespace and a restrained academic cue.",
        "content_slide": "Keep the page topic immediately recognizable, but let title alignment, supporting accents, and surrounding composition adapt to the teaching content.",
        "closing": "Use a concise acknowledgement or closing statement together with a subject-relevant visual or summary echo; keep the page informative and visually complete rather than leaving a nearly empty text-only slide.",
        "flexibility": "Treat the title system as a consistency guide rather than a fixed template. Do not force every slide into the same header, rule, alignment, or decorative treatment."
      },
      "layout_patterns": [
        "course cover combining a clear title hierarchy with subject-relevant visual material and concise course information",
        "concept explanation using the most suitable combination of diagrams, images, definitions, formulas, source excerpts, or annotated examples",
        "sequence, process, development, or causal explanation with a clear viewing order",
        "comparison or relationship page whose structure follows the concepts being contrasted or connected",
        "case, text, artwork, experiment, event, or application analysis supported by relevant evidence and explanation",
        "overview or synthesis page organizing examples, themes, findings, or knowledge relationships",
        "knowledge summary using a concise framework, conclusion, or takeaway",
        "closing or acknowledgement page combining a short closing statement with a restrained subject-relevant visual"
      ],
      "layout_usage_rule": "Choose the layout that best supports the teaching objective and viewing sequence. Every slide should combine meaningful visual explanation with readable text; use one strong visual or several complementary photographs, diagrams, charts, maps, formulas, documents, artworks, screenshots, or annotated examples according to the discipline and content. Keep the visual language coherent without forcing every page into cards, equal columns, or one repeated composition.",
      "layout_blueprints": [
        {
          "name": "概念 / 知识讲解",
          "sections": [
            {
              "position": "title area",
              "count": 1,
              "labels": [
                "lesson question or core concept"
              ]
            },
            {
              "position": "primary teaching field",
              "count": 1,
              "labels": [
                "the most suitable visual and explanatory structure for the concept"
              ]
            },
            {
              "position": "supporting field",
              "count": 1,
              "labels": [
                "definitions, examples, evidence, annotations, or implications as needed"
              ]
            }
          ]
        },
        {
          "name": "过程 / 关系讲解",
          "sections": [
            {
              "position": "title area",
              "count": 1,
              "labels": [
                "process, development, comparison, or relationship topic"
              ]
            },
            {
              "position": "primary relationship field",
              "count": 1,
              "labels": [
                "sequence, cause, contrast, hierarchy, interaction, or transformation"
              ]
            },
            {
              "position": "supporting field",
              "count": 1,
              "labels": [
                "conditions, examples, evidence, annotations, or summary as needed"
              ]
            }
          ]
        },
        {
          "name": "案例 / 材料 / 证据",
          "sections": [
            {
              "position": "context field",
              "count": 1,
              "labels": [
                "case, text, event, artwork, experiment, or application context"
              ]
            },
            {
              "position": "evidence field",
              "count": 1,
              "labels": [
                "relevant visual material, source excerpt, data, observations, or comparison"
              ]
            },
            {
              "position": "teaching conclusion field",
              "count": 1,
              "labels": [
                "interpretation, lesson learned, or takeaway"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "discipline-relevant photographs, artworks, archival documents, source excerpts, maps, formulas, tables, charts, diagrams, screenshots, multi-image evidence groups, annotated images, timelines, relationship structures, restrained icons, and subtle academic background texture; cards and grids may be used when they genuinely clarify the material but are not the default",
        "avoid": "text-only pages, purely decorative illustration, repetitive card grids, default three-column layouts, generic AI-looking imagery, unsupported futuristic or technical styling, random 3D icons, playful stickers, excessive gradients, heavy shadows, glossy elements, inconsistent icon styles, dense ungrouped text, unrelated stock imagery, and ornamental layouts that weaken the teaching sequence"
      },
      "image_treatment": {
        "photos": "use relevant and credible course or case images as evidence, crop them consistently, and pair them with concise explanatory labels; one page may use a single main image or several complementary images when they explain different aspects of the topic",
        "screenshots": "place inside clean frames and preserve important interface details, annotations, and labels",
        "charts": "use the palette semantically, retain accurate axes and values, and emphasize the comparison or trend being taught",
        "illustrations": "choose diagrams, maps, explanatory drawings, documentary collage, symbolic graphics, or other illustration treatments appropriate to the discipline and lesson; avoid decorative scenes that do not teach anything",
        "discipline_materials": "treat formulas, artworks, historical documents, literary excerpts, medical images, scientific figures, and other subject-specific materials as valid visual evidence when relevant and accurately represented"
      },
      "rendering_constraints": [
        "The slide must look like professional academic courseware, not a marketing pitch deck.",
        "Prioritize teaching sequence, conceptual clarity, and readable evidence over visual decoration.",
        "Every slide must contain both meaningful visual content and readable text; visuals should explain, demonstrate, compare, or provide evidence rather than merely decorate.",
        "Visual content may include photographs, diagrams, charts, maps, formulas, artworks, documents, source excerpts, screenshots, or other discipline-appropriate material; it does not always mean a decorative illustration.",
        "Avoid both underfilled slides and long blocks of prose. Convert dense explanations into diagrams, image groups, structured labels, or concise teaching points.",
        "Keep related information visibly grouped and maintain a clear viewing order.",
        "Avoid tiny text; split or simplify content when it cannot remain readable at presentation distance.",
        "Use semantic accent colors consistently across the deck.",
        "Do not force every slide into repeated cards, equal columns, a fixed module count, or an identical information grid.",
        "Avoid an obvious AI-generated look: no fabricated text inside images, implausible photo details, generic glowing technology effects, random decorative objects, or repetitive template-like compositions.",
        "Do not invent university, school, laboratory, company, or course logos; use only user-provided identity assets.",
        "Do not inherit topics, examples, imagery, terminology, or organizations from a style reference unless they are required by the source content.",
        "No watermark and no unrelated logo."
      ]
    }
  },
  {
    "name": "数据仪表盘风",
    "scenarios": [
      "数据分析报告",
      "业绩展示",
      "KPI 汇报",
      "实时数据展示",
      "商业智能BI",
      "运营数据看板"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "数据仪表盘风",
      "best_for": "数据密集型汇报、运营分析、KPI 复盘和业务洞察展示",
      "visual_direction": "bright modern SaaS analytics dashboard, clean BI interface, lightweight data cards, precise charts, professional and non-oppressive",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "white #FFFFFF, very light blue-gray #F5F8FC, or mist gray #F8FAFC",
        "composition": "dashboard grid with title area, KPI cards, chart panels, and status list",
        "density": "medium-high information density with enough card spacing and clear grouping"
      },
      "color_palette": {
        "primary": "data blue #2563EB or #1976D2",
        "secondary": "cyan #06B6D4 and soft purple #8B5CF6",
        "status": "green #10B981, orange #F59E0B, red #EF4444 used sparingly",
        "text": "deep navy #0F172A and neutral gray #64748B",
        "rule": "avoid dark control-room backgrounds, heavy neon, and oppressive black panels"
      },
      "typography": {
        "title": "bold clean sans-serif, dashboard header style",
        "numbers": "large tabular numerals for KPI values",
        "labels": "small but readable sans-serif chart labels",
        "text_quality": "Chinese labels and KPI names must be exact and legible"
      },
      "layout_patterns": [
        "top KPI strip with 3-4 cards and trend arrows",
        "main area split into workflow cards and a line chart",
        "lower area with donut chart, bar chart, and recent activity table",
        "large central insight card surrounded by supporting metrics"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "SaaS BI overview",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "dashboard title and subtitle"
              ]
            },
            {
              "position": "top-right",
              "count": 4,
              "labels": [
                "KPI card 1",
                "KPI card 2",
                "KPI card 3",
                "KPI card 4"
              ]
            },
            {
              "position": "middle-left",
              "count": 3,
              "labels": [
                "process card 1",
                "process card 2",
                "process card 3"
              ]
            },
            {
              "position": "middle-right",
              "count": 1,
              "labels": [
                "line chart panel"
              ]
            },
            {
              "position": "bottom",
              "count": 3,
              "labels": [
                "donut chart",
                "bar chart",
                "recent records table"
              ]
            }
          ]
        },
        {
          "name": "single insight dashboard",
          "sections": [
            {
              "position": "center",
              "count": 1,
              "labels": [
                "large insight card"
              ]
            },
            {
              "position": "surrounding",
              "count": 4,
              "labels": [
                "supporting metric",
                "trend sparkline",
                "status list",
                "risk indicator"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "white cards, soft shadows, pale borders, line charts, bar charts, progress rings, KPI cards, status dots, trend arrows, mini sparklines",
        "avoid": "dark monitoring wall, dense cyberpunk glow, unreadable tiny table text, random numbers without structure"
      },
      "rendering_constraints": [
        "The slide should look like a polished SaaS analytics product screenshot adapted for presentation.",
        "Charts should be visually plausible and organized, even when illustrative.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "清爽专业风",
    "scenarios": [
      "毕业答辩",
      "工作总结",
      "工作 review",
      "技术分享",
      "项目复盘",
      "晋升述职",
      "阶段性成果汇报"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "清爽专业风",
      "best_for": "毕业答辩、工作总结、工作 review、技术分享、项目复盘和晋升述职等需要清晰表达过程、成果、问题和下一步的场景",
      "visual_direction": "clean modern professional deck, calm technical presentation, structured evidence-driven layout, readable pragmatic visual system, light background with crisp hierarchy",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "warm white #FFFFFF, light gray #F8FAFC, or very pale blue #F6F9FF",
        "composition": "title zone, structured content zone, evidence/diagram zone, and concise takeaway zone",
        "density": "medium information density, enough room for technical details without visual clutter"
      },
      "color_palette": {
        "primary": "professional blue #2563EB or slate blue #334155",
        "secondary": "calm teal #0F766E or muted cyan #0891B2",
        "accent": "soft amber #F59E0B for highlights and risk/attention notes",
        "neutral": "slate gray #475569, light border #E2E8F0, pale card background #F8FAFC",
        "rule": "use restrained professional colors; avoid playful neon, luxury gold, or heavy dark backgrounds"
      },
      "typography": {
        "title": "clear bold sans-serif, report-like and authoritative",
        "body": "clean sans-serif, strong hierarchy, left-aligned for readability",
        "labels": "small but readable labels for timeline, evidence, metrics, and code/process diagrams",
        "text_quality": "Chinese text must be exact, readable, and suitable for formal reporting"
      },
      "layout_patterns": [
        "problem-process-result-next steps",
        "timeline plus milestone cards",
        "technical architecture diagram with key takeaways",
        "summary dashboard with achievements, issues, learnings, and plan",
        "defense slide with research question, method, evidence, and conclusion"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "work review summary",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "slide title and context subtitle"
              ]
            },
            {
              "position": "left column",
              "count": 3,
              "labels": [
                "目标",
                "完成情况",
                "关键结果"
              ]
            },
            {
              "position": "right column",
              "count": 2,
              "labels": [
                "问题与风险",
                "下一步计划"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "one-sentence takeaway"
              ]
            }
          ]
        },
        {
          "name": "technical sharing flow",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "topic title and motivation"
              ]
            },
            {
              "position": "center",
              "count": 1,
              "labels": [
                "architecture / workflow / method diagram"
              ]
            },
            {
              "position": "right",
              "count": 3,
              "labels": [
                "核心机制",
                "实践经验",
                "注意事项"
              ]
            },
            {
              "position": "bottom",
              "count": 3,
              "labels": [
                "before",
                "after",
                "impact"
              ]
            }
          ]
        },
        {
          "name": "graduation defense evidence slide",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "研究问题 / 答辩主题"
              ]
            },
            {
              "position": "left",
              "count": 1,
              "labels": [
                "方法路线图"
              ]
            },
            {
              "position": "center",
              "count": 2,
              "labels": [
                "实验/项目证据",
                "关键数据"
              ]
            },
            {
              "position": "right",
              "count": 1,
              "labels": [
                "结论与贡献"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "限制与后续工作"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "timeline, checklist, progress bars, architecture blocks, process arrows, evidence cards, metric badges, issue/risk callouts, code-like panels, simple icons",
        "avoid": "overly decorative poster layout, random stock photos, cute stickers, dense unreadable tables, exaggerated marketing style"
      },
      "rendering_constraints": [
        "The slide should look suitable for a real workplace review, thesis defense, or technical sharing session.",
        "Prioritize clarity, evidence, and logical flow over decoration.",
        "All diagrams and labels should feel purposeful and related to the slide content.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "温暖手工风",
    "scenarios": [
      "儿童教育",
      "文化活动",
      "手工艺展示",
      "温馨主题",
      "亲子活动",
      "艺术工作坊",
      "社区公益项目"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "温暖手工风",
      "best_for": "教育、公益、文化、成长、社区和需要温度感的主题演示",
      "visual_direction": "warm handmade paper collage slide, tactile paper craft, gentle human-centered storytelling, cozy scrapbook composition",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "warm cream paper #F5F1E8 or pale wood #E8DCC8 with subtle paper fibers",
        "composition": "paper cutout title area, 3 paper note cards for key points, gentle illustration accents",
        "density": "airy and comforting, generous breathing room"
      },
      "color_palette": {
        "primary": "warm brown #A67C52 and deep cocoa #5C4033 for text",
        "soft_colors": "dusty pink #F5C4B8, sage green #B8D4A8, sky blue #A8D8EA, sunset orange #FFA574, lavender #C9B1D0",
        "surface": "cream, handmade paper, kraft paper, pastel sticky notes",
        "rule": "all colors should feel soft, matte, and paper-like"
      },
      "typography": {
        "title": "rounded handwritten or friendly display style",
        "body": "clear friendly handwritten or rounded sans-serif Chinese text",
        "emphasis": "paper labels, stitched tags, small handwritten captions",
        "text_quality": "Chinese text must be accurate and legible"
      },
      "layout_patterns": [
        "three torn-paper cards aligned naturally across the slide",
        "scrapbook title ribbon with small illustrated stickers",
        "central handmade diagram with taped labels",
        "soft paper collage with one warm illustration and supporting notes"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "paper note cards",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "torn-paper title ribbon"
              ]
            },
            {
              "position": "center",
              "count": 3,
              "labels": [
                "paper card 1",
                "paper card 2",
                "paper card 3"
              ]
            },
            {
              "position": "corners",
              "count": 4,
              "labels": [
                "small sticker",
                "tape strip",
                "plant doodle",
                "paper clip"
              ]
            }
          ]
        },
        {
          "name": "scrapbook story",
          "sections": [
            {
              "position": "left",
              "count": 1,
              "labels": [
                "warm illustration or paper collage scene"
              ]
            },
            {
              "position": "right",
              "count": 3,
              "labels": [
                "key point note",
                "example note",
                "takeaway note"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "handwritten closing line"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "paper texture, torn edges, tape, paper clips, buttons, watercolor blocks, simple doodles, plant stickers, soft shadows",
        "avoid": "glossy plastic look, corporate sharp edges, harsh black text, neon colors, overly childish clutter"
      },
      "rendering_constraints": [
        "The slide should feel handmade but still presentation-ready.",
        "Paper shadows and textures should be subtle and not reduce text legibility.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "电子墨水杂志风",
    "scenarios": [
      "线下分享",
      "行业内部讲话",
      "AI / 科技产品发布",
      "Demo day",
      "个人观点型演讲",
      "非虚构叙事",
      "需要强节奏感的主题演讲"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "电子墨水杂志风",
      "best_for": "线下演讲、观点分享、AI/科技发布、非虚构叙事和需要强个人表达的横向演示",
      "visual_direction": "electronic ink editorial presentation, premium magazine layout, serif headline, sans-serif body, monospace metadata, restrained WebGL-like ink flow background only as subtle texture, strong hero/non-hero rhythm",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "off-white #F7F4EA, ink black #111111, deep indigo #1E2A78, forest ink #163B2F, kraft paper #D8C3A5, or dune sand #D9C29E depending on theme",
        "composition": "editorial grid with strong margins, magazine-like hierarchy, hero pages alternating with quieter content pages",
        "density": "moderate to low information density, designed for stage readability and narrative pacing"
      },
      "color_palette": {
        "base": "paper-like light background or deep ink background",
        "primary": "ink black, off-white, or deep indigo",
        "accent": "one restrained accent such as vermilion, electric blue, forest green, or sand gold",
        "metadata": "muted gray or low-contrast monochrome",
        "rule": "use a curated theme palette; avoid random custom colors and decorative gradients"
      },
      "typography": {
        "title": "large editorial serif Chinese headline or elegant high-contrast display type",
        "body": "clean sans-serif, short paragraphs or compact bullets",
        "metadata": "small monospace labels for chapter, date, source, index, or tags",
        "text_quality": "Chinese text must be exact, readable, and typeset like a magazine spread"
      },
      "layout_patterns": [
        "hero cover with oversized serif headline and subtle ink-flow background",
        "chapter divider with one provocative sentence and metadata strip",
        "data poster with one huge number, footnote, and tiny supporting labels",
        "left text right image with image treated as editorial photography or abstract ink plate",
        "big quote page with pull quote, source line, and large whitespace",
        "before-after comparison with two editorial columns"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. Choose and adapt the composition according to each slide's semantic role; alternate hero and non-hero pages to create rhythm, and avoid repeating the same blueprint on adjacent slides unless it is a deliberate repeated sequence.",
      "layout_blueprints": [
        {
          "name": "hero editorial opener",
          "sections": [
            {
              "position": "left or center",
              "count": 1,
              "labels": [
                "oversized serif headline"
              ]
            },
            {
              "position": "top or side edge",
              "count": 3,
              "labels": [
                "chapter label",
                "date/source",
                "short metadata"
              ]
            },
            {
              "position": "background",
              "count": 1,
              "labels": [
                "subtle ink-flow or paper texture"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "one-line thesis"
              ]
            }
          ]
        },
        {
          "name": "magazine argument spread",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "slide title"
              ]
            },
            {
              "position": "left column",
              "count": 2,
              "labels": [
                "argument block",
                "evidence block"
              ]
            },
            {
              "position": "right half",
              "count": 1,
              "labels": [
                "editorial image, diagram, or abstract visual plate"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "monospace metadata strip"
              ]
            }
          ]
        },
        {
          "name": "data broadsheet",
          "sections": [
            {
              "position": "center-left",
              "count": 1,
              "labels": [
                "huge number or keyword"
              ]
            },
            {
              "position": "right column",
              "count": 3,
              "labels": [
                "supporting fact 1",
                "supporting fact 2",
                "supporting fact 3"
              ]
            },
            {
              "position": "bottom-left",
              "count": 1,
              "labels": [
                "source / caveat / time range"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "editorial rules, thin dividers, paper grain, subtle ink-flow texture, cropped photography zones, metadata strips, chapter marks, pull quotes, huge numerals",
        "avoid": "template-like cards, shiny corporate gradients, cute illustrations, dense tables, dashboard overload, generic stock-photo collage"
      },
      "rendering_constraints": [
        "The slide should feel like an electronic magazine page adapted for a stage presentation.",
        "Use large readable typography and strong whitespace.",
        "Do not turn every page into a hero cover; alternate page intensity across the deck.",
        "No watermark, no unrelated logo, no slide number unless explicitly requested."
      ]
    }
  },
  {
    "name": "科研答辩风",
    "scenarios": [
      "科研项目申报答辩",
      "基金申请与重点专项汇报",
      "中期检查与结题验收",
      "论文开题、预答辩和毕业答辩",
      "课题分解、技术路线、研究基础、风险分析和预期成果展示",
      "高校、科研院所、实验室和产学研项目的正式汇报"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "科研答辩风",
      "best_for": "科研项目申报、基金答辩、课题中期检查、结题验收、论文答辩和实验室阶段性成果汇报等正式学术场景",
      "visual_direction": "formal Chinese academic research defense deck, authoritative but adaptable project presentation, evidence-driven layout, structured scientific diagrams, concise conclusions, and disciplined visual hierarchy",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "clean white #FFFFFF with subtle light gray #F5F7FA content background",
        "composition": "structured academic slide with title area, evidence area, explanatory diagrams, tables, callouts, or conclusion area chosen according to slide content",
        "density": "medium-high to high information density, suitable for serious academic defense, while keeping clear reading order and alignment"
      },
      "color_palette": {
        "primary": "deep academic blue #003F8F or #004A9F",
        "secondary": "research blue #0B5CAD and pale blue #EAF2FF",
        "accent": "formal red #B5121B or #C00000 used sparingly for key conclusions, risks, breakthroughs, and emphasized phrases",
        "neutral": "black #111111, dark gray #333333, light border gray #D8DEE8, pale table fill #F3F6FA",
        "optional": "muted gold #F3DFA2 only for cover or major title emphasis",
        "rule": "prefer blue for structure and red for critical arguments, but adapt emphasis to the topic and source material; avoid colorful decorative palettes, heavy gradients, playful icons, and casual illustration styles"
      },
      "typography": {
        "title": "bold Chinese sans-serif, large, formal, report-like, left aligned",
        "section_labels": "white bold Chinese text on deep blue blocks or arrow labels",
        "body": "dense but readable Chinese sans-serif, mostly black, key phrases in red bold",
        "tables": "compact academic table typography with clear header rows and restrained category emphasis",
        "text_quality": "Chinese text must be exact, readable, non-garbled, and suitable for formal research defense"
      },
      "page_system": {
        "header": "usually use a clear title area with optional section number and optional project/institution mark; cover pages and divider pages may use a different composition",
        "divider": "optional thin horizontal rule, blue segment, or subtle academic separator when it helps hierarchy",
        "body": "structured content area with light borders, module labels, evidence cards, diagrams, or tables as needed",
        "footer": "optional one-sentence takeaway strip or conclusion line when the slide needs a strong final claim",
        "logo_rule": "use only user-provided logos or a neutral text placeholder such as 项目标识; do not invent real institution logos or unrelated brand names"
      },
      "layout_patterns": [
        "research background with literature timeline, policy/report evidence, and problem statement",
        "research status with left-side evidence collage and right-side challenge comparison",
        "topic decomposition with multi-column task chain and right-side vertical research path",
        "research content page with three evidence cards and supporting mechanism images",
        "core objective page with arrow label, large target sentence, technical route, and mechanism diagram",
        "platform support page with equipment photos, prior achievements, certificates, and bullet evidence",
        "risk analysis four-quadrant grid with risk type, risk judgment, mitigation evidence, and bottom conclusion",
        "expected outcomes table with category, measurable indicators, and assessment method"
      ],
      "layout_usage_rule": "Use these patterns as flexible starting points, not mandatory templates. Keep the deck's academic tone, disciplined hierarchy, restrained palette, and evidence-first logic, while adapting the body layout to each slide's role and source material.",
      "layout_blueprints": [
        {
          "name": "研究背景 / 研究现状",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "one-sentence problem or status statement with optional emphasized phrases"
              ]
            },
            {
              "position": "left large area",
              "count": 1,
              "labels": [
                "literature timeline / technical evolution / evidence collage"
              ]
            },
            {
              "position": "right column",
              "count": 1,
              "labels": [
                "report evidence / industry challenge / application pain point"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "optional takeaway conclusion"
              ]
            }
          ]
        },
        {
          "name": "课题分解 / 技术路线",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "project objective sentence"
              ]
            },
            {
              "position": "middle",
              "count": 3,
              "labels": [
                "课题一",
                "课题二",
                "课题三"
              ]
            },
            {
              "position": "left side",
              "count": 2,
              "labels": [
                "应用基础研究",
                "关键任务核心内容"
              ]
            },
            {
              "position": "right side",
              "count": 4,
              "labels": [
                "性能研究",
                "应用验证",
                "深入探索",
                "关系研究"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "chain-summary sentence"
              ]
            }
          ]
        },
        {
          "name": "核心目标 / 研究目标",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "blue arrow label: 核心目标 or 研究目标"
              ]
            },
            {
              "position": "top-right",
              "count": 1,
              "labels": [
                "target sentence with key phrases"
              ]
            },
            {
              "position": "middle",
              "count": 2,
              "labels": [
                "content detail box 1",
                "content detail box 2"
              ]
            },
            {
              "position": "bottom",
              "count": 3,
              "labels": [
                "method diagram",
                "mechanism image",
                "application validation image"
              ]
            },
            {
              "position": "bottom-center",
              "count": 1,
              "labels": [
                "technical route statement"
              ]
            }
          ]
        },
        {
          "name": "研究内容 / 证据展示",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "research content sentence with key variables"
              ]
            },
            {
              "position": "middle",
              "count": 3,
              "labels": [
                "研究内容一",
                "研究内容二",
                "研究内容三"
              ]
            },
            {
              "position": "inside each card",
              "count": 3,
              "labels": [
                "blue title bar",
                "scientific figure or chart",
                "short evidence caption"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "integrated conclusion or mechanism statement"
              ]
            }
          ]
        },
        {
          "name": "风险分析",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "risk control thesis statement"
              ]
            },
            {
              "position": "middle grid",
              "count": 4,
              "labels": [
                "技术风险",
                "安全风险",
                "性能风险",
                "管理风险"
              ]
            },
            {
              "position": "bottom",
              "count": 1,
              "labels": [
                "supporting scientific images and final conclusion"
              ]
            }
          ]
        },
        {
          "name": "预期成果 / 考核指标",
          "sections": [
            {
              "position": "top",
              "count": 3,
              "labels": [
                "高价值",
                "全覆盖",
                "可量化"
              ]
            },
            {
              "position": "middle",
              "count": 1,
              "labels": [
                "large table: 类别 / 具体指标 / 考核方式"
              ]
            },
            {
              "position": "left table column",
              "count": 4,
              "labels": [
                "理论创新与知识产权",
                "技术突破与材料开发",
                "人才培养与学术影响",
                "长远发展潜力"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "academic tables, blue arrow labels, restrained red emphasis text, flow arrows, technical route diagrams, paper figure collages, mechanism diagrams, laboratory or equipment photos, certificates, report thumbnails, structured grids, light shadows",
        "avoid": "minimalist empty pages, marketing hero layouts, cartoon illustrations, decorative gradients, random icons, playful stickers, excessive whitespace, vague stock photos, fruits, animals, people cutouts, unrelated decorative objects"
      },
      "writing_style": {
        "sentence_patterns": [
          "系统研究……并揭示……机制",
          "构建……体系，实现……精准调控",
          "围绕……形成完整闭环研究链条",
          "通过……验证……性能",
          "可有效规避或化解……风险",
          "所有成果均设置具体、可测量指标"
        ],
        "emphasis_rule": "Use red bold text selectively for the scientific problem, key breakthrough, risk judgment, measurable outcome, or page-level conclusion; do not over-highlight every sentence."
      },
      "rendering_constraints": [
        "The slide must look like a serious Chinese academic research defense deck, not a commercial pitch deck.",
        "Keep a recognizable academic presentation system across slides, but do not force every page into the same header or grid.",
        "Every page should have a clear top-to-bottom or left-to-right reading order.",
        "Use high-density scientific content, but keep text blocks aligned and readable.",
        "Use blue structural labels and red conclusion phrases when useful, without making the page mechanically blue-red.",
        "Do not include fruit, people, animals, random objects, fictional brand marks, or unrelated decorative icons.",
        "No watermark, no unrelated logo, no fake real institution logo, no extra slide number unless requested."
      ]
    }
  },
  {
    "name": "麦肯锡风格",
    "scenarios": [
      "商业咨询型 PPT / PPTX 整套演示",
      "PPT 封面页、章节页、关键观点页",
      "咨询分析页、框架页、方法论页",
      "流程图、路线图、矩阵图、价值链、五力模型、2x2 定位图",
      "结论页、建议页、执行路线页",
      "商业策略、增长、转型、组织、效率、机会、风险等主题",
      "需要“文字主导 + 商业隐喻 + 咨询报告质感”的视觉型演示"
    ],
    "brief": {
      "type": "16:9 full-slide PowerPoint image",
      "style_name": "麦肯锡风格",
      "best_for": "商业咨询型 PPT / PPTX 整套演示，包括封面页、章节页、关键观点页、咨询分析页、框架页、方法论页、流程图、路线图、矩阵图、价值链、五力模型、2x2 定位图、结论页、建议页和执行路线页；适合商业策略、增长、转型、组织、效率、机会、风险等需要麦肯锡式理性气质、高端咨询报告视觉、标题信息重构、商业隐喻和清晰商业叙事的场景",
      "visual_direction": "McKinsey / BCG / Bain style rational consulting visual, premium executive report cover, modernist typographic poster, art-directed business metaphor, reconstructed title as architectural structure, precision annotation system, sharp Swiss grid, light blue-gray white palette, clean corporate editorial design, boardroom-ready restraint with real graphic tension",
      "canvas": {
        "aspect_ratio": "16:9",
        "background": "white or very pale cool gray field with optional subtle paper grain, light print texture, precise thin grid, quiet margin system, and restrained report-like metadata; avoid turning metadata into a repeated slide template",
        "composition": "first decide the PPT slide role: title/divider/key-message slides use one giant reconstructed core word, one dominant metaphor, strong negative space, and an intentional focal axis, vanishing point, or typographic architecture; analysis/framework/process slides use one core analytical structure and 3-6 ordered modules",
        "density": "title/divider/key-message slides are low-density with strong whitespace and one obvious center; analysis/framework/process slides are medium density, richer but still ordered, scannable, and built around one reading path"
      },
      "color_palette": {
        "primary": "white, off-white, light cool gray, pale blue-gray, ink blue-gray #243447 used as text or hairline emphasis",
        "secondary": "restrained consulting blue-gray, steel blue, mist blue, precise hairline gray",
        "accent": "very small restrained blue, steel blue, or muted gray-blue only for key node, value point, end point, decision point, or important arrow; avoid orange as a default accent",
        "neutral": "near-black #111111 only for small text, slate gray #475569, cool gray #6B7280, light border gray #D8DEE8, very pale background gray #F6F8FA",
        "rule": "colors must feel rational, premium, controlled, and light; avoid large dark navy blocks, orange-led accents, blue-purple neon, cyberpunk glow, fancy gradients, rainbow colors, high-saturation advertising colors, and large warm backgrounds"
      },
      "typography": {
        "title": "modern, clear, restrained, stable consulting-report typography; the main visual title should be custom-reconstructed with thin structural strokes, semi-hollow forms, split strokes, extended strokes, modular cuts, embedded grids, or architectural skeletons; keep it readable and avoid crude bold filled type",
        "body": "short precise Chinese/English labels, no long paragraphs, clear hierarchy, micro-typography for tags, variables, legends, nodes, occasional footers, and conclusions",
        "labels": "use restrained English classification labels such as STRATEGY, MARKET INSIGHT, BUSINESS MODEL, OPERATING MODEL, GROWTH SYSTEM, TRANSFORMATION, INDUSTRY VIEW, METHODOLOGY, RECOMMENDATION, ROADMAP, 2026",
        "text_quality": "main title, subtitle, brand names, people names, terms, English capitalization, and Chinese characters must be accurate; preserve the user's core input term; do not garble Chinese or invent unrelated labels"
      },
      "layout_patterns": [
        "PPT title or divider slide: top information bar with full title, English category tags, year or section number; central giant reconstructed core word; 2-3 edge anchor concepts; optional short takeaway only when it strengthens the page",
        "PPT key-message slide: extract a 2-8 character Chinese core word or 1-4 word English phrase as the main visual, keep the full claim as smaller subtitle text, and use only one dominant metaphor",
        "PPT title/key-message slide: fuse one business metaphor into the typography itself, such as path through strokes, funnel in negative space, matrix grid as character skeleton, data flow emerging from the word, fault line cutting the word, or architecture becoming the word body",
        "PPT title/key-message slide: make the core word feel engineered and art-directed: letter strokes may be cropped, extended, split, semi-transparent, line-drawn, or connected to crosshairs, target marks, measurement lines, nodes, and micro labels",
        "PPT title/key-message slide: create graphic tension through scale contrast, asymmetrical balance, precise alignment, restrained perspective rays, one focal point, and large quiet whitespace; avoid flat centered template composition",
        "PPT title/divider archetype: typographic science/report slide with ultra-thin Chinese character strokes, molecular or data-path particles crossing the word, side annotations, and optional evidence labels",
        "PPT key-message archetype: executive insight slide with a bold but controlled headline, one ribbon/path/spiral/arrow metaphor, vertical outcome scale, small right-side labels, and wide blank field",
        "PPT title/divider archetype: modernist typographic poster slide with oversized English or Chinese letterforms, curved line systems, crop marks, circular labels, and sparse deck metadata",
        "PPT analysis/framework slide: top claim area, central structure such as process, matrix, system, path, funnel, value chain, or layered architecture, side modules for insight, variables, constraints, risks, and opportunities, and an optional recommendation area if the slide needs a takeaway",
        "PPT analysis/process slide: use a clear reading path from left to right, top to bottom, problem to solution, input to output, current state to opportunity, or mechanism to result",
        "PPT framework slide: keep one large analytical mechanism as the hero and use micro annotations, numbered labels, hairline connectors, and restrained side notes instead of icon-heavy cards",
        "PPT analysis archetype: BCG-style matrix, five-forces map, value-chain map, operating-model map, roadmap, or 2x2 decision map with one dominant diagram, disciplined sidebars, small methodology labels, and at most one dark emphasis block",
        "metaphor library: choose exactly one most accurate dominant metaphor from funnel, path, ladder, matrix, coordinate, flywheel, node network, data flow, threshold, window, defense line, fault line, container, compass, or architecture",
        "business metaphor matching: funnel for conversion and filtering; path for strategy and transformation; ladder for maturity and value upgrade; matrix for positioning and priority; coordinate for market map and risk-return; flywheel for growth loops; node network for system collaboration; data flow for automation and efficiency; threshold for gating and risk control; window for timing and opportunity; defense line for governance and compliance; fault line for structural shifts; container for value pools; compass for direction choice; architecture for organization and capability base"
      ],
      "layout_usage_rule": "Use layout_blueprints as candidate starting points only. First identify the PPT slide role: title slide, section divider, key-message slide, analysis/framework slide, process/roadmap slide, matrix/positioning slide, or summary/recommendation slide. For title, divider, and key-message slides, use one giant reconstructed title, one dominant metaphor, low information density, strong whitespace, very few auxiliary words, and a visible graphic idea in the typography itself. For analysis, framework, process, and recommendation slides, use 3-6 main modules, one core structure, one dominant metaphor, concise labels, small legends or numbering, and a clear reading path. Keep a McKinsey-like rational, professional, restrained, premium identity while varying slide layouts across the deck. The slide should feel designed, not merely organized: use optical balance, scale contrast, precise margins, micro labels, and one memorable visual decision. Do not turn a secondary motif, footer, icon, callout strip, or module arrangement into a repeated master layout. Avoid default card grids, generic flowchart templates, and slides that only look organized but have no visual concept.",
      "layout_blueprints": [
        {
          "name": "PPT 封面页 / 章节页: 重构标题 + 单一商业隐喻",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "完整标题 / 英文分类标签 / 年份或编号"
              ]
            },
            {
              "position": "center",
              "count": 1,
              "labels": [
                "giant reconstructed core word"
              ]
            },
            {
              "position": "inside typography",
              "count": 1,
              "labels": [
                "one dominant metaphor fused into typography"
              ]
            },
            {
              "position": "left and right edge",
              "count": 3,
              "labels": [
                "起点词",
                "终点词",
                "价值词"
              ]
            },
            {
              "position": "optional bottom or side",
              "count": 1,
              "labels": [
                "short takeaway only when useful"
              ]
            }
          ]
        },
        {
          "name": "PPT 关键观点页: 字体结构 + 咨询报告系统",
          "sections": [
            {
              "position": "top-left",
              "count": 1,
              "labels": [
                "small complete title system"
              ]
            },
            {
              "position": "top-right",
              "count": 4,
              "labels": [
                "STRATEGY",
                "INSIGHT",
                "REPORT COVER",
                "2026"
              ]
            },
            {
              "position": "center 70%",
              "count": 1,
              "labels": [
                "large typographic architecture"
              ]
            },
            {
              "position": "background",
              "count": 1,
              "labels": [
                "thin grid, nodes, coordinates, hairline rules"
              ]
            },
            {
              "position": "optional edge metadata",
              "count": 3,
              "labels": [
                "CLARITY",
                "STRUCTURE",
                "IMPACT or slide-specific tags"
              ]
            }
          ]
        },
        {
          "name": "PPT 分析页: 核心结构 + 左右辅助模块",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "title, subtitle, classification tags"
              ]
            },
            {
              "position": "center",
              "count": 1,
              "labels": [
                "core flow / matrix / system / funnel / value chain"
              ]
            },
            {
              "position": "left",
              "count": 2,
              "labels": [
                "background insight",
                "key variable"
              ]
            },
            {
              "position": "right",
              "count": 2,
              "labels": [
                "risk or constraint",
                "opportunity or action"
              ]
            },
            {
              "position": "optional bottom or right rail",
              "count": 1,
              "labels": [
                "1-3 concise conclusions when needed"
              ]
            }
          ]
        },
        {
          "name": "PPT 框架页: 矩阵 / 坐标 / 路线图",
          "sections": [
            {
              "position": "top",
              "count": 1,
              "labels": [
                "complete analytical title and short subtitle"
              ]
            },
            {
              "position": "main area",
              "count": 1,
              "labels": [
                "2x2 matrix / coordinate map / roadmap"
              ]
            },
            {
              "position": "inside structure",
              "count": 4,
              "labels": [
                "category",
                "priority",
                "risk",
                "opportunity"
              ]
            },
            {
              "position": "side rail",
              "count": 1,
              "labels": [
                "methodology notes and legend"
              ]
            },
            {
              "position": "optional bottom or side note",
              "count": 1,
              "labels": [
                "executive implication when needed"
              ]
            }
          ]
        }
      ],
      "visual_elements": {
        "allowed": "custom typographic reconstruction, thin rules, precision grid, small nodes, coordinates, occasional target marks, crosshair marks, measurement lines, path lines, subtle vanishing rays, restrained arrows, faint perspective, variable report metadata, small numbering, minimal business diagrams, restrained chart fragments, one dark emphasis area when analytically necessary, paper grain, light print texture, subtle shadows, small legends, micro annotations",
        "avoid": "ordinary big title, no title reconstruction, no visual metaphor, disconnected metaphor and text, unrelated background decoration, generic PPT template, default rounded card grid, repeated decorative motif across all slides, repeated header/footer treatment across all slides, repetitive icon rows, icon-heavy modules, business people icons, handshake icons, cartoon characters, robot avatars, sci-fi blue-purple background, uncontrolled complex infographic, content with no hierarchy, overly thick or ornate typography, unreadable main title, overfilled composition, cheap self-media poster feel"
      },
      "rendering_constraints": [
        "The image must feel like a premium top-tier consulting-company visual work, not an official McKinsey template, not an ordinary PPT page, and not a social-media template.",
        "Text must be part of the structure, not just placed on top of the layout.",
        "The slide must have a visible graphic idea: a typographic structure, focal axis, engineered metaphor, or analytical mechanism that would still be recognizable without decorative labels.",
        "If the source title is long, extract a core visual word or phrase and preserve the complete title as smaller text in the header, side title system, or subtitle.",
        "Choose exactly one dominant metaphor for PPT title, divider, and key-message slides; do not stack multiple unrelated metaphors.",
        "For PPT analysis, framework, process, roadmap, and recommendation slides, all modules must unfold around one dominant metaphor and one core analytical structure.",
        "For PPT title, divider, and key-message slides, allow only 1 giant main visual title, 1 complete small title, 2-4 English tags, 1 dominant metaphor, optional short conclusion, and a few thin lines, nodes, numbering, or grid marks.",
        "For PPT title, divider, and key-message slides, forbid 5 or more modules, 3 or more charts, long explanations, dense icons, multiple conclusion boxes, and full process breakdown.",
        "For PPT analysis, framework, process, roadmap, and recommendation slides, use 3-6 main modules, 1 core large structure, 1-2 auxiliary small structures, key data, labels, numbering, annotations, and optional recommendation or implication area.",
        "For PPT analysis, framework, process, roadmap, and recommendation slides, forbid 8 or more modules, too many colors, too many icons, unlayered text, long paragraphs inside every module, and data/graphics without logical relationship.",
        "Use precise thin lines, small labels, grid, nodes, and a restrained light blue-gray-white palette; avoid large areas of heavy dark blue.",
        "Avoid making every page a neat card layout; use scale, negative space, alignment, and typographic reconstruction to create design value.",
        "Across a deck, keep palette, typography, line language, and report discipline consistent, but vary the dominant structure, secondary motif, and module arrangement according to each slide's role.",
        "Even if most decoration is removed, the core structure and business logic must still stand.",
        "Do not invent a real McKinsey logo, client logo, confidential label, proprietary watermark, unrelated logo, or watermark."
      ]
    }
  }
]
