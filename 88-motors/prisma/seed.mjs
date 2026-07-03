// Seeds demo inventory + example leads so the app is usable out of the box.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vehicles = [
  {
    year: 2018, make: "Toyota", model: "Camry", trim: "SE", bodyStyle: "Sedan",
    mileage: 78500, price: 15900, cost: 12500, condition: "Excellent",
    exteriorColor: "Silver", interiorColor: "Black", transmission: "Automatic",
    fuelType: "Gasoline", drivetrain: "FWD", engine: "2.5L 4-Cyl",
    features: "Backup camera, Bluetooth, Lane assist, Alloy wheels",
    description: "One owner, clean Carfax. Runs and drives excellent. New tires and fresh oil change.",
    status: "AVAILABLE", featured: true, stockNumber: "88-0001", photo: "/demo/car3.svg",
  },
  {
    year: 2016, make: "Honda", model: "CR-V", trim: "EX", bodyStyle: "SUV",
    mileage: 95200, price: 13500, cost: 10200, condition: "Very Good",
    exteriorColor: "Blue", interiorColor: "Gray", transmission: "CVT",
    fuelType: "Gasoline", drivetrain: "AWD", engine: "2.4L 4-Cyl",
    features: "Sunroof, Heated seats, Backup camera, Keyless entry",
    description: "AWD perfect for winter. Well maintained, no accidents.",
    status: "AVAILABLE", featured: true, stockNumber: "88-0002", photo: "/demo/car2.svg",
  },
  {
    year: 2015, make: "Ford", model: "F-150", trim: "XLT", bodyStyle: "Truck",
    mileage: 112000, price: 18900, cost: 15000, condition: "Good",
    exteriorColor: "Red", interiorColor: "Gray", transmission: "Automatic",
    fuelType: "Gasoline", drivetrain: "4WD", engine: "5.0L V8",
    features: "Tow package, Bed liner, Crew cab, Running boards",
    description: "Work-ready truck. Strong V8, tows anything you need.",
    status: "AVAILABLE", featured: true, stockNumber: "88-0003", photo: "/demo/car1.svg",
  },
  {
    year: 2019, make: "Chevrolet", model: "Malibu", trim: "LT", bodyStyle: "Sedan",
    mileage: 61000, price: 14500, cost: 11800, condition: "Excellent",
    exteriorColor: "White", interiorColor: "Black", transmission: "Automatic",
    fuelType: "Gasoline", drivetrain: "FWD", engine: "1.5L Turbo",
    features: "Apple CarPlay, Remote start, Backup camera",
    description: "Low miles, great on gas. Like-new condition inside and out.",
    status: "AVAILABLE", stockNumber: "88-0004", photo: "/demo/car5.svg",
  },
  {
    year: 2014, make: "Nissan", model: "Altima", trim: "S", bodyStyle: "Sedan",
    mileage: 128000, price: 7900, cost: 5500, condition: "Good",
    exteriorColor: "Gray", interiorColor: "Black", transmission: "CVT",
    fuelType: "Gasoline", drivetrain: "FWD", engine: "2.5L 4-Cyl",
    features: "Bluetooth, Cruise control, Power windows",
    description: "Great first car or commuter. Cold A/C, drives smooth.",
    status: "PENDING", stockNumber: "88-0005", photo: "/demo/car4.svg",
  },
  {
    year: 2017, make: "Jeep", model: "Grand Cherokee", trim: "Laredo", bodyStyle: "SUV",
    mileage: 89000, price: 16800, cost: 13500, condition: "Very Good",
    exteriorColor: "Purple", interiorColor: "Black", transmission: "Automatic",
    fuelType: "Gasoline", drivetrain: "4WD", engine: "3.6L V6",
    features: "Leather seats, Navigation, Tow package, Heated seats",
    description: "Loaded Laredo with 4x4. Ready for the mountains.",
    status: "SOLD", soldPrice: 16200, soldAt: new Date(), stockNumber: "88-0006", photo: "/demo/car6.svg",
  },
];

async function main() {
  const count = await prisma.vehicle.count();
  if (count > 0) {
    console.log(`Database already has ${count} vehicles — skipping seed.`);
    return;
  }

  for (const { photo, ...v } of vehicles) {
    const vehicle = await prisma.vehicle.create({
      data: { ...v, photos: { create: [{ url: photo, sortOrder: 0 }] } },
    });
    console.log(`Created ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
  }

  const camry = await prisma.vehicle.findFirst({ where: { model: "Camry" } });
  const altima = await prisma.vehicle.findFirst({ where: { model: "Altima" } });

  await prisma.lead.create({
    data: {
      name: "Maria Gonzalez",
      phone: "(801) 555-0142",
      message: "Hi! I'm interested in the 2018 Toyota Camry SE. Is it still available?",
      source: "WEBSITE",
      status: "NEW",
      vehicleId: camry?.id,
    },
  });
  await prisma.lead.create({
    data: {
      name: "Kevin Smith",
      phone: "(801) 555-0198",
      message: "Saw the Altima on Marketplace. Can I come see it Saturday?",
      source: "MARKETPLACE",
      status: "APPOINTMENT",
      vehicleId: altima?.id,
      notes: { create: [{ body: "Viene el sábado a las 11am a ver el carro." }] },
    },
  });
  console.log("Created 2 demo leads.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
