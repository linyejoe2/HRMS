import mongoose from 'mongoose';
import { config } from '../config';
import { holidaySeedService } from '../services/holidaySeedService';

/**
 * Standalone script to seed weekend holidays (Saturdays and Sundays)
 *
 * Usage:
 *   npm run seed:weekends 2024              # Seed for a single year
 *   npm run seed:weekends 2024 2026         # Seed for a range of years
 */

async function main() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB successfully');

    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.error('Error: Please provide a year or year range');
      console.log('Usage:');
      console.log('  npm run seed:weekends 2024');
      console.log('  npm run seed:weekends 2024 2026');
      process.exit(1);
    }

    if (args.length === 1) {
      // Seed for a single year
      const year = parseInt(args[0]);

      if (isNaN(year) || year < 1900 || year > 2100) {
        console.error('Error: Invalid year. Must be between 1900 and 2100');
        process.exit(1);
      }

      console.log(`\nGenerating weekend holidays for ${year}...`);
      const result = await holidaySeedService.seedWeekendHolidays(year);

      console.log('\n✓ Completed!');
      console.log(`  Created: ${result.created}`);
      console.log(`  Skipped (already exists): ${result.skipped}`);
      console.log(`  Total weekends: ${result.created + result.skipped}`);
    } else if (args.length === 2) {
      // Seed for a range of years
      const startYear = parseInt(args[0]);
      const endYear = parseInt(args[1]);

      if (
        isNaN(startYear) ||
        isNaN(endYear) ||
        startYear < 1900 ||
        endYear > 2100 ||
        startYear > endYear
      ) {
        console.error('Error: Invalid year range');
        process.exit(1);
      }

      console.log(`\nGenerating weekend holidays for ${startYear}-${endYear}...`);
      const result = await holidaySeedService.seedWeekendHolidaysByRange(
        startYear,
        endYear
      );

      console.log('\n✓ Completed!');
      console.log(`  Total Created: ${result.totalCreated}`);
      console.log(`  Total Skipped: ${result.totalSkipped}`);
      console.log('\nBreakdown by year:');
      result.years.forEach((year) => {
        console.log(
          `  ${year.year}: ${year.created} created, ${year.skipped} skipped`
        );
      });
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
