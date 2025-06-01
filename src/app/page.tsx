// Located in: app/page.tsx (or src/app/page.tsx)
'use client'
// import { Button } from "@/components/ui/button"; // Import the Button component
import BackgroundWithContent from "@/components/ui/Background";
export default function Home() {
  

  return (
    <main className="">
      <BackgroundWithContent />
      

      {/* Use the ShadCN Button component
      <Button variant="outline" size="lg" onClick={() => alert("Button Clicked!")}>
        Click Me!
      </Button> */}

      {/* You can add more buttons with different variants */}
      
    </main>
  );
}
