"use server";

import Link from 'next/link';
import { Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-16">

        {/* Header */}
        <header className="text-center mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            DBML Hub
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Visualize DBML and PostgreSQL schemas as interactive diagrams using React Flow
          </p>
        </header>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              title: 'See Your Database Clearly',
              desc: 'Transform abstract schema code into clear, interactive diagrams. Instantly understand relationships and structure.',
            },
            {
              title: 'Instantly Compare Schemas',
              desc: 'Spend less time parsing syntax and more time designing better databases.',
            },
            {
              title: 'Work Faster, Make Fewer Errors',
              desc: 'Edit schemas in real-time and catch design issues early before they become costly problems.',
            },
            {
              title: 'Support Both SQL and DBML',
              desc: 'Supports DBML for schema design and visualization, and also SQL for database schema management. Export diagrams as PNG or SVG for docs and presentations so everyone stays aligned.',
            }
          ].map((item, i) => (
            <Card
              key={i}
              className="transition-all hover:shadow-md hover:-translate-y-1"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base font-semibold">
                  <Code className="h-5 w-5 text-primary" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-14">
          <Button asChild size="lg" className="px-8 shadow-md">
            <Link href="/view" className="flex items-center gap-2">
              Get Started
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </Button>
        </div>

        {/* Example */}
        <section className="mt-14 pt-12 border-t">
          <h2 className="text-2xl font-semibold mb-6">
            Example DBML Schema
          </h2>

          <div className="rounded-lg bg-muted/50 p-6 overflow-x-auto border">
            <pre className="text-sm leading-relaxed">
              <code className="language-dbml">
                {`Table users {
  id integer [pk, increment]
  email varchar
  name varchar
  created_at timestamp
}

Table posts {
  id integer [pk, increment]
  title varchar
  content text
  author_id integer
  created_at timestamp
}

Ref: posts.author_id > users.id`}
              </code>
            </pre>
          </div>
        </section>

      </div>
    </main>
  );
}