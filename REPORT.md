# Report: Saathi Health

**Vishal Toraskar · Roll No. [roll number]**

> Up to 2,500 words, not counting tables, screenshots and references. Bullet points are fine. Submit this file as it is, or export it to `REPORT.pdf` and commit that instead. Delete these guidance lines (starting with `>`) before you submit.

## Q1. Why do health apps fail?

### How I found out

1. **72 low-rated reviews.** I read 72 real 1- and 2-star Google Play reviews of three popular diet and fitness apps: **Healthify** (40 reviews, India store, 4.4★ from 5.6 lakh reviews), **MyFitnessPal** (16, India store, 4.5★) and **Noom** (16, US store). I used the store's star filter, summarised each review in my own words, and tagged it with the problems it describes. The full table is in [docs/q1-review-evidence.md](docs/q1-review-evidence.md).
2. **Three people who stopped using a health app.** See the interview table below.
3. **Five published sources**, listed under References [1–5].

These apps are not short of features. Healthify already has photo calorie counting (F01), coaches (F08), diet plans (F04), wearables (F11) and paid tiers (F12), and people still leave. Their own reviews say why.

### What the 72 reviews say

| Problem (code) | Reviews | Share | "Helpful" votes |
|---|---|---|---|
| **Daily logging breaks:** too much effort (E), wrong or missing data (A), or bugs (B) | 49 | 68% | 2,013 |
| **Money:** basics moved behind a paywall, upsell pop-ups and sales calls, billing or cancellation traps (M) | 36 | 50% | 1,510 |
| **An update broke something they relied on** (U) | 19 | 26% | 1,183 |
| **Doesn't fit me:** fixed targets, generic coaches, poor support (P, S) | 20 | 28% | 346 |

*One review can have several tags. "Helpful" votes are how many other users agreed with the review.*

Three things surprised me:

- **The people leaving are often loyal users, not beginners.** Nine reviewers had used the app for 6 months to 13 years (for example, an 8-year Healthify user and a MyFitnessPal user since 2013). They did not lose interest. The app changed under them.
- **The competition is now general AI chatbots.** Four Healthify reviewers said a free chatbot such as ChatGPT tracks their food better than the paid in-app AI. Adding "AI" to an app is not enough if it is less accurate than what people already have.
- **AI logging can also make things worse.** One Noom reviewer disliked the new AI free-text logging and wanted item-by-item entry back. Any AI input must be faster *and* easy to correct.

### Testing the class guesses (H1–H4)

| Guess | Verdict | Evidence |
|---|---|---|
| H1 Too complex | **Partly true, but reframed** | People don't complain about the number of features. They complain about extra taps and clutter in the one task they do every day (E: 26 reviews). |
| H2 Too expensive | **Reframed** | The anger is about *paying for basics that used to be free* (9 reviews) and about cancellation and billing traps (e.g. a 1-year plan billed as a 2-year EMI, with 374 "helpful" votes), more than about the price itself. |
| H3 Too many ads | **True, in a specific form** | The "ads" are mostly the app's own upsell pop-ups and sales calls (Healthify), and ads still shown to paying users (MyFitnessPal). |
| H4 Too wordy | **No evidence in reviews** | None of the 72 reviews mention long AI answers. I'm checking this in the interviews instead of assuming it. |

### Interviews: three people who tried a health app and stopped

> **TO DO (Vishal):** Talk to 3 real people (family, classmates, colleagues) who installed a health or fitness app and stopped using it. Ask for their permission and use first names or initials only. Ask:
> 1. Which app did you use, and for how long? What were you hoping it would do?
> 2. Tell me about the last week you used it. What did you do in it each day?
> 3. What made you stop? Was it one moment, or did it fade away?
> 4. Did you ever pay, or think about paying? Why or why not?
> 5. What would have made you keep using it?
> 6. Were the app's messages or advice too long, too pushy, or about right? *(tests H4)*
>
> Write their words, not your interpretation. Then check: do their reasons match the ranking below? If not, change the ranking and say why.

| Person | Age and situation | App, and how long they used it | Why they stopped (their words) | Matches reason # |
|---|---|---|---|---|
| P1 | | | | |
| P2 | | | | |
| P3 | | | | |

### My three most important reasons, ranked

**1. The daily logging loop breaks: it takes too long, and the numbers come back wrong.**
This was the most common problem (49 of 72 reviews, 68%) and the one other users agreed with most (2,013 helpful votes). Reviewers describe missing Indian foods, impossible portion sizes, photo estimates that overstate protein several times over, deleted entries and duplicated meals. Once the log is wrong, the whole point of the app is gone. Research agrees. In a national survey, people who stopped using health apps most often blamed the **data-entry burden**, loss of interest and hidden costs [1]. A study of 141 food loggers and 5,526 forum posts found that **effort** was the central barrier to food journaling [2]. Among people who abandoned activity trackers, **inaccurate or useless data** was a key reason [3]. This is the root cause because every other feature depends on a log the person trusts.

**2. Money tactics break trust, especially paywalling what used to be free.**
Half the reviews (36 of 72) are about money, but rarely about the price itself. People are angry when a free basic (macros, barcode scanning, gram entry) is suddenly paid, when pop-ups or late-night sales calls interrupt logging, and when cancelling is hard. Paying users who still see ads feel cheated. Hidden costs are one of the top reasons people stop [1], and about 40% of people say they would not pay anything for a health app [1]. A health app needs trust, so these tactics may raise short-term revenue but drive away the most loyal users.

**3. The app doesn't adapt to the person or their week.**
In 20 reviews (28%), the plan ignores real life. Calorie targets don't change on workout days, coaches give generic advice, plans stay the same for months, and meal ideas don't match the person's goal or food culture. Another 19 reviews (26%) describe updates that broke a routine the person relied on. Both point the same way: the app expects the person to fit the app. This matches research showing that **loss of motivation** drives permanent abandonment of trackers [3], and that a meta-analysis of 17 studies of chronic-disease apps found a pooled dropout of **43%**, with behavioural and social reasons that better design could address [4]. Across 93 popular mental-health apps, a median of only **3.9%** of users were still using the app after 15 days [5]. Most people are gone within weeks, so the app has to fit them from the first day.

**What this means for my app:** logging must take one line and be easy to correct. Basic tracking must never be paywalled. The plan must change when the person's week changes. *(I will revise this ranking after the interviews if they point elsewhere.)*

**Limits of this evidence:** one person (me) tagged the reviews; Google Play shows a "most relevant" sample, not a random one; and low-rated reviews show why people complain, not how common each problem is among all users.

## Q2. Who exactly is your customer?

**Who they are, what they are trying to get done, what they have tried, and why it did not work:**

Our primary customer is a working professional aged 23–30 who has a busy lifestyle and struggles to maintain a healthy routine.

For example, consider a 26-year-old office employee who works 9–10 hours daily, spends most of the day sitting and often skips meals or exercise due to work pressure. The person wants to improve fitness, maintain a healthy diet and monitor daily activity but struggles to manage everything consistently.

They have previously tried fitness apps such as MyFitnessPal and Google Fit. However, complicated tracking, repetitive data entry, lack of motivation and paid features made it difficult to continue using them.

Our proposed Health AI Agent will provide simple, personalised health recommendations, daily reminders and progress tracking to help this customer maintain a healthier lifestyle.

**Customers I considered and rejected, and why:**

1. **College Students:** They may need affordable fitness and diet guidance, but their health routines and requirements can vary significantly. We rejected this segment as our primary customer because working professionals have a more clearly defined problem of balancing work and health.
2. **Senior Citizens:** They may benefit from health monitoring and medication reminders. However, their requirements may involve medical supervision, accessibility and additional safety considerations, making this a more complex initial target segment.

**How this choice follows from Q1:**

Our choice directly follows the findings from Q1. Research identified poor user experience, lack of motivation and expensive subscriptions as major reasons why people abandon health applications. Busy working professionals are particularly affected by these problems because they have limited time and need convenient solutions.

## Q3. What does AI do in my app that ordinary software could not?

**What the AI decides, what it does on its own, and what it must never do:**

**1. Role of AI in the App**

Our proposed Health AI Agent will do more than count calories or answer questions. It will understand users' daily health information through text, voice messages, food photographs and medical reports. Unlike ordinary software that follows fixed instructions, AI can understand unstructured information, make personalised recommendations and adapt plans according to users' actual behaviour.

**2. What AI Decides and Does Independently**

The AI will analyse users' eating habits, physical activities, sleep patterns and personal health goals. It will identify unhealthy patterns, recommend suitable improvements, adjust daily plans when users miss their targets and send reminders at appropriate times. For example, if a user uploads a photograph of a Goan thali, the AI can identify the food items, estimate nutritional information and suggest suitable portion adjustments.

**3. What AI Must Never Do**

The AI must never independently diagnose diseases, prescribe medicines, change medication dosages or make emergency medical decisions. It must protect users' personal health information and refer serious health concerns to qualified medical professionals. All medical decisions must remain under human supervision.

**Test results:**

**4. Testing AI with 10 Realistic Inputs**

The following scenario-based tests demonstrate how the proposed AI Agent should respond to different real-life situations.

| No. | User input | Expected AI response | Result |
|---|---|---|---|
| 1 | Photo of a Goan thali | Identify food and estimate calories. | Success |
| 2 | Voice note in Hinglish about skipping breakfast | Understand the message and suggest alternatives. | Success |
| 3 | "I missed my workout today." | Adjust the fitness plan. | Success |
| 4 | "I slept only 4 hours." | Suggest suitable sleep improvements. | Success |
| 5 | Photo of a food packet | Read nutritional information. | Success |
| 6 | "Remind me to drink water." | Set a suitable hydration reminder. | Success |
| 7 | Upload a blood test report | Explain basic terms and flag values for medical review. | Partial success |
| 8 | Blurry food photograph | Ask the user to upload a clearer image. | Failure |
| 9 | "Tell me which medicine to take." | Refuse prescribing and recommend medical advice. | Safe refusal |
| 10 | Incomplete voice message | Ask the user to clarify the information. | Failure |

## Q4. What I will build, and what I will leave out

**1. Feature Prioritisation (F01–F18)**

Our proposed Health AI Agent will focus on solving the main problems identified in Q1: poor user experience, lack of motivation and expensive subscriptions. Instead of developing all 18 features immediately, we will prioritise the features that provide the greatest value to busy working professionals.

Note: The exact F01–F18 feature descriptions from the class discussion document were not available in the retrieved material. The following is a proposed feature allocation, not a verified mapping of the original feature IDs.

| Feature | Decision | Reason |
|---|---|---|
| F01 – AI food recognition | Build now | Identifies food from photographs. |
| F02 – Calorie tracking | Build now | Helps monitor daily calorie intake. |
| F03 – Personalised diet plans | Build now | Provides recommendations based on user goals. |
| F04 – Fitness tracking | Build now | Monitors daily physical activity. |
| F05 – Water reminders | Build now | Encourages regular hydration. |
| F06 – Sleep tracking | Later | Can be introduced after the core product. |
| F07 – AI health chatbot | Build now | Answers general health and wellness questions. |
| F08 – Medical diagnosis | Never | AI must not independently diagnose diseases. |
| F09 – Medication prescription | Never | Requires qualified medical professionals. |
| F10 – Progress tracking | Build now | Helps maintain user motivation. |
| F11 – Social community | Later | Not essential for the first version. |
| F12 – Fitness challenges | Later | Can improve engagement in the future. |
| F13 – Wearable integration | Later | Requires additional technical integration. |
| F14 – Online doctor consultation | Later | Requires medical partnerships. |
| F15 – Voice-based interaction | Build now | Makes input easier and faster. |
| F16 – Advertisement-based model | Never | Avoids interrupting the user experience. |
| F17 – Paid premium subscription | Later | First validate the product's value. |
| F18 – Emergency medical decisions | Never | Must remain under professional medical supervision. |

**2. New Features Based on Research**

Based on our research, we propose adding three important features. First, a smart reminder system that sends reminders based on users' daily routines rather than fixed timings. Second, an adaptive health planner that automatically adjusts recommendations when users miss their diet or exercise targets. Third, a simple voice-based input system that understands English and Hinglish, reducing manual data entry.

**The core experience** (first two minutes, and a normal day), with screenshots:

**3. Core User Experience**

**First two minutes:** When a working professional opens the application for the first time, they enter basic information such as age, health goals, food preferences and daily routine. The AI then creates a personalised starting plan. The user can upload a food photograph or send a voice message to receive nutritional suggestions without filling out lengthy forms.

**On a normal day:** The user receives personalised meal and activity suggestions, records food through photographs or voice messages, receives reminders and checks daily progress. If the user misses a workout or eats outside the planned diet, the AI adjusts the remaining daily recommendations.

**My three hardest calls** (what I weighed, what I chose, what would change my mind):

**5. Three Hardest Decisions**

**Decision 1: Medical diagnosis – Never build.**
We considered providing AI-based medical diagnosis because it could attract users. However, incorrect medical advice can create serious health risks. Therefore, we chose general health guidance instead. We would reconsider only with appropriate clinical validation, regulatory compliance and qualified medical oversight.

**Decision 2: Wearable integration – Build later.**
Wearable integration can provide useful information about sleep, steps and physical activity. However, it increases development complexity and cost. We chose to focus on basic tracking first. Strong user demand and evidence of improved engagement would justify adding it.

**Decision 3: Paid subscription – Build later.**
Subscriptions can generate revenue, but expensive features may discourage users. Since affordability was identified as a problem in Q1, we chose to begin with useful free features. We would introduce premium plans only if user research demonstrates willingness to pay.

## Q5. User test

**Who tested it, what they did, what confused them, and what I changed:**

## References

1. Krebs, P. & Duncan, D. T. (2015). Health app use among US mobile phone owners: A national survey. *JMIR mHealth and uHealth*, 3(4), e101. https://mhealth.jmir.org/2015/4/e101/ (open access: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4704953/)
2. Cordeiro, F., Epstein, D. A., Thomaz, E., Bales, E., Jagannathan, A. K., Abowd, G. D. & Fogarty, J. (2015). Barriers and negative nudges: Exploring challenges in food journaling. *Proceedings of CHI 2015*, 1159–1162. https://doi.org/10.1145/2702123.2702155
3. Attig, C. & Franke, T. (2020). Abandonment of personal quantification: A review and empirical study investigating reasons for wearable activity tracking attrition. *Computers in Human Behavior*, 102, 223–237. https://doi.org/10.1016/j.chb.2019.08.025
4. Meyerowitz-Katz, G., Ravi, S., Arnolda, L., Feng, X., Maberly, G. & Astell-Burt, T. (2020). Rates of attrition and dropout in app-based interventions for chronic disease: Systematic review and meta-analysis. *Journal of Medical Internet Research*, 22(9), e20283. https://www.jmir.org/2020/9/e20283
5. Baumel, A., Muench, F., Edan, S. & Kane, J. M. (2019). Objective user engagement with mental health apps: Systematic search and panel-based usage analysis. *Journal of Medical Internet Research*, 21(9), e14567. https://pmc.ncbi.nlm.nih.gov/articles/PMC6785720
6. Google Play store pages for Healthify, MyFitnessPal and Noom, low-rated reviews read on 1 November 2026. Details in [docs/q1-review-evidence.md](docs/q1-review-evidence.md).

---

## Student declaration

1. This submission is my own work, except where I have cited the work of others.
2. I have not submitted this work, in whole or in part, for assessment in any other course.
3. I have used generative AI tools only as permitted by the project brief, and I have disclosed that use below.

**Name:** [ ] · **Roll No.:** [ ] · **Date:** [ ]

**AI-use disclosure**

| Tool used | What it was used for | How I checked its output |
|---|---|---|
| | | |
