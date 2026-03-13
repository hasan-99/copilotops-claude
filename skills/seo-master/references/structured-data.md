# Structured Data Templates (JSON-LD)

Complete, validated JSON-LD templates for every common schema type. Copy and adapt these — fill in bracketed values with real data from the page.

## Table of Contents

1. [Organization](#organization)
2. [WebSite with SearchAction](#website-with-searchaction)
3. [LocalBusiness](#localbusiness)
4. [Service](#service)
5. [Product](#product)
6. [Article / BlogPosting](#article--blogposting)
7. [FAQPage](#faqpage)
8. [HowTo](#howto)
9. [BreadcrumbList](#breadcrumblist)
10. [Person](#person)
11. [Event](#event)
12. [VideoObject](#videoobject)
13. [SoftwareApplication](#softwareapplication)
14. [ContactPoint](#contactpoint)
15. [AggregateRating / Review](#aggregaterating--review)
16. [Course](#course)
17. [Recipe](#recipe)
18. [JobPosting](#jobposting)

---

## Organization

Use on: Homepage, About page

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Company Name]",
  "url": "[https://example.com]",
  "logo": "[https://example.com/logo.png]",
  "description": "[Brief company description]",
  "foundingDate": "[YYYY]",
  "founder": {
    "@type": "Person",
    "name": "[Founder Name]"
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Street]",
    "addressLocality": "[City]",
    "addressRegion": "[State/Region]",
    "postalCode": "[Postal Code]",
    "addressCountry": "[Country Code]"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "[+1-xxx-xxx-xxxx]",
    "contactType": "customer service",
    "email": "[email@example.com]"
  },
  "sameAs": [
    "[https://linkedin.com/company/xxx]",
    "[https://twitter.com/xxx]",
    "[https://github.com/xxx]"
  ]
}
```

## WebSite with SearchAction

Use on: Homepage (enables sitelinks search box in Google)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "[Site Name]",
  "url": "[https://example.com]",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "[https://example.com/search?q={search_term_string}]"
    },
    "query-input": "required name=search_term_string"
  }
}
```

## LocalBusiness

Use on: Homepage, Contact page (for businesses with physical locations)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "url": "[https://example.com]",
  "telephone": "[+1-xxx-xxx-xxxx]",
  "email": "[email@example.com]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Street Address]",
    "addressLocality": "[City]",
    "addressRegion": "[State/Region]",
    "postalCode": "[Postal Code]",
    "addressCountry": "[Country Code]"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[XX.XXXXX]",
    "longitude": "[XX.XXXXX]"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "priceRange": "[$$ or description]",
  "image": "[https://example.com/storefront.jpg]",
  "sameAs": ["[social media URLs]"]
}
```

## Service

Use on: Service/offering pages

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "[Service Name]",
  "description": "[Service description, 150-300 chars]",
  "provider": {
    "@type": "Organization",
    "name": "[Company Name]",
    "url": "[https://example.com]"
  },
  "serviceType": "[Category of service]",
  "areaServed": {
    "@type": "Place",
    "name": "[City, Country or worldwide]"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "[Catalog Name]",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "[Sub-service Name]",
          "description": "[Brief description]"
        }
      }
    ]
  }
}
```

## Product

Use on: Product pages, e-commerce

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Product Name]",
  "description": "[Product description]",
  "image": ["[https://example.com/product1.jpg]"],
  "sku": "[SKU]",
  "brand": {
    "@type": "Brand",
    "name": "[Brand Name]"
  },
  "offers": {
    "@type": "Offer",
    "url": "[https://example.com/product]",
    "priceCurrency": "[USD]",
    "price": "[29.99]",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "[Seller Name]"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[4.5]",
    "reviewCount": "[89]"
  }
}
```

## Article / BlogPosting

Use on: Blog posts, articles, news

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Article Title — max 110 chars]",
  "description": "[Article description — 150-160 chars]",
  "image": "[https://example.com/article-image.jpg]",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "author": {
    "@type": "Person",
    "name": "[Author Name]",
    "url": "[https://example.com/about]"
  },
  "publisher": {
    "@type": "Organization",
    "name": "[Publisher Name]",
    "logo": {
      "@type": "ImageObject",
      "url": "[https://example.com/logo.png]"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "[https://example.com/blog/slug]"
  },
  "wordCount": "[1500]",
  "keywords": "[keyword1, keyword2, keyword3]"
}
```

## FAQPage

Use on: Any page with FAQ section

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Question text?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text. Can include <a href='url'>links</a> in HTML.]"
      }
    },
    {
      "@type": "Question",
      "name": "[Another question?]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Another answer.]"
      }
    }
  ]
}
```

## HowTo

Use on: Tutorial or process pages

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "[How to Do X]",
  "description": "[Brief description of the process]",
  "totalTime": "PT[X]M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "[0 or cost]"
  },
  "step": [
    {
      "@type": "HowToStep",
      "name": "[Step 1 Title]",
      "text": "[Step 1 description]",
      "url": "[https://example.com/guide#step1]",
      "image": "[https://example.com/step1.jpg]"
    },
    {
      "@type": "HowToStep",
      "name": "[Step 2 Title]",
      "text": "[Step 2 description]"
    }
  ]
}
```

## BreadcrumbList

Use on: All pages (helps Google understand site hierarchy)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "[https://example.com]"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Category]",
      "item": "[https://example.com/category]"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Current Page]",
      "item": "[https://example.com/category/page]"
    }
  ]
}
```

## Person

Use on: About page, team page, author pages

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "[Full Name]",
  "jobTitle": "[Job Title]",
  "worksFor": {
    "@type": "Organization",
    "name": "[Company Name]"
  },
  "url": "[https://example.com/about]",
  "image": "[https://example.com/headshot.jpg]",
  "sameAs": [
    "[https://linkedin.com/in/xxx]",
    "[https://twitter.com/xxx]"
  ],
  "knowsAbout": ["[Skill 1]", "[Skill 2]", "[Skill 3]"]
}
```

## Event

Use on: Event pages, webinar pages

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "[Event Name]",
  "description": "[Event description]",
  "startDate": "[YYYY-MM-DDTHH:MM:SS+00:00]",
  "endDate": "[YYYY-MM-DDTHH:MM:SS+00:00]",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": "[https://example.com/event]"
  },
  "organizer": {
    "@type": "Organization",
    "name": "[Organizer Name]",
    "url": "[https://example.com]"
  },
  "offers": {
    "@type": "Offer",
    "price": "[0]",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "[https://example.com/register]"
  }
}
```

## VideoObject

Use on: Pages with embedded video content

```json
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "[Video Title]",
  "description": "[Video description]",
  "thumbnailUrl": "[https://example.com/thumbnail.jpg]",
  "uploadDate": "[YYYY-MM-DD]",
  "duration": "PT[X]M[Y]S",
  "contentUrl": "[https://example.com/video.mp4]",
  "embedUrl": "[https://youtube.com/embed/xxx]",
  "publisher": {
    "@type": "Organization",
    "name": "[Publisher Name]",
    "logo": {
      "@type": "ImageObject",
      "url": "[https://example.com/logo.png]"
    }
  }
}
```

## SoftwareApplication

Use on: SaaS product pages, app landing pages

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "[App Name]",
  "description": "[App description]",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "[https://example.com]",
  "offers": {
    "@type": "Offer",
    "price": "[0]",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[4.5]",
    "ratingCount": "[100]"
  }
}
```

## ContactPoint

Use alongside Organization schema

```json
{
  "@type": "ContactPoint",
  "telephone": "[+1-xxx-xxx-xxxx]",
  "contactType": "customer service",
  "email": "[email@example.com]",
  "availableLanguage": ["English", "Arabic"],
  "contactOption": "TollFree",
  "areaServed": "[Country or region]"
}
```

## AggregateRating / Review

Nest inside Product, LocalBusiness, or Organization

```json
{
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[4.8]",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "[150]",
    "reviewCount": "[45]"
  },
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "[Reviewer Name]"
      },
      "datePublished": "[YYYY-MM-DD]",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "[5]"
      },
      "reviewBody": "[Review text]"
    }
  ]
}
```

## Course

Use on: Course/training pages

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "[Course Title]",
  "description": "[Course description]",
  "provider": {
    "@type": "Organization",
    "name": "[Provider Name]",
    "url": "[https://example.com]"
  },
  "courseCode": "[COURSE-101]",
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseSchedule": {
      "@type": "Schedule",
      "repeatFrequency": "P1W"
    }
  }
}
```

## Recipe

Use on: Recipe pages

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "[Recipe Name]",
  "description": "[Recipe description]",
  "image": ["[https://example.com/dish.jpg]"],
  "author": {
    "@type": "Person",
    "name": "[Chef Name]"
  },
  "datePublished": "[YYYY-MM-DD]",
  "prepTime": "PT[X]M",
  "cookTime": "PT[X]M",
  "totalTime": "PT[X]M",
  "recipeYield": "[4 servings]",
  "recipeCategory": "[Dinner]",
  "recipeCuisine": "[Italian]",
  "recipeIngredient": [
    "[2 cups flour]",
    "[1 cup sugar]"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "text": "[Step 1 instructions]"
    }
  ],
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "[250 calories]"
  }
}
```

## JobPosting

Use on: Career/job listing pages

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "[Job Title]",
  "description": "[Full job description in HTML]",
  "datePosted": "[YYYY-MM-DD]",
  "validThrough": "[YYYY-MM-DD]",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "[Company Name]",
    "sameAs": "[https://example.com]",
    "logo": "[https://example.com/logo.png]"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "[City]",
      "addressRegion": "[State]",
      "addressCountry": "[Country]"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": "[50000]",
      "maxValue": "[80000]",
      "unitText": "YEAR"
    }
  },
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "[Country]"
  },
  "jobLocationType": "TELECOMMUTE"
}
```

---

## Validation Rules

When generating or reviewing structured data, verify:

1. **@context** is exactly `"https://schema.org"` (not http, not schema.org without protocol)
2. **Required fields** are present per type (Google's rich result requirements)
3. **No invisible content** — structured data must match what users see on the page
4. **Valid URLs** — all url/image fields use absolute HTTPS URLs
5. **Valid dates** — ISO 8601 format (YYYY-MM-DD or full datetime)
6. **No deprecated types** — avoid types Google has dropped support for
7. **Nesting** — prefer @type nesting over flat @id references for simplicity
8. **One script per type** — use separate `<script type="application/ld+json">` blocks for unrelated types
