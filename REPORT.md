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

**Test results:**

| # | Input | What the AI did | Good enough? |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |

## Q4. What I will build, and what I will leave out

| ID | Feature | Build now / Later / Never | Reason |
|---|---|---|---|
| F01 | Food photo to calories | | |
| F02 | Profile and goals | | |
| F03 | Activity tracking | | |
| F04 | Diet plan | | |
| F05 | Progress tracker | | |
| F06 | Sleep tracking | | |
| F07 | Challenges and motivation | | |
| F08 | AI health coach | | |
| F09 | Catch-up planning | | |
| F10 | Reports | | |
| F11 | Wearables | | |
| F12 | Subscription tiers | | |
| F13 | Free consultation | | |
| F14 | Community activities | | |
| F15 | Emergency: hospital | | |
| F16 | Emergency: caretaker or nurse | | |
| F17 | Guardian access | | |
| F18 | Friends groups | | |
| N01 | [Any feature you added] | | |

**The core experience** (first two minutes, and a normal day), with screenshots:

**My three hardest calls** (what I weighed, what I chose, what would change my mind):

1.
2.
3.

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
