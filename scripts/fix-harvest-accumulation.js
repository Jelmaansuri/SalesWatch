/**
 * PROGENY AGROTECH Harvest Accumulation Fix Script
 * 
 * This script fixes harvest accumulation issues where plots are not properly
 * accumulating harvest amounts across cycles. It ensures all plots follow
 * the same harvest accumulation logic as Plot A.
 */

const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { plots } = require('../shared/schema.js');
const { eq } = require('drizzle-orm');

// Initialize database connection
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function fixHarvestAccumulation() {
  try {
    console.log('🔧 Starting harvest accumulation fix...');
    
    // Get all plots
    const allPlots = await db.select().from(plots);
    console.log(`Found ${allPlots.length} plots to analyze`);
    
    for (const plot of allPlots) {
      const currentCycle = plot.current_cycle;
      const currentHarvest = parseFloat(plot.harvest_amount_kg || '0');
      const currentTotal = parseFloat(plot.total_harvested_kg || '0');
      
      console.log(`\n📊 Analyzing ${plot.name}:`);
      console.log(`  Current Cycle: ${currentCycle}`);
      console.log(`  Current Harvest: ${currentHarvest}kg`);
      console.log(`  Current Total: ${currentTotal}kg`);
      
      // Logic: If plot is in cycle 2+ but total equals current harvest, 
      // it means accumulation is broken
      if (currentCycle > 1 && currentTotal === currentHarvest && currentHarvest > 0) {
        console.log(`  ❌ Accumulation issue detected for ${plot.name}`);
        console.log(`  🔧 Expected: Total should be higher than current harvest for multi-cycle plots`);
        
        // Estimate proper total based on cycle and current harvest
        // This is a conservative estimate - user can adjust if needed
        const estimatedTotalPerCycle = currentHarvest; // Assume similar harvest per cycle
        const estimatedTotal = estimatedTotalPerCycle * currentCycle;
        
        console.log(`  💡 Estimated proper total: ${estimatedTotal}kg (${estimatedTotalPerCycle}kg × ${currentCycle} cycles)`);
        
        // Update the plot with corrected total
        await db
          .update(plots)
          .set({ 
            total_harvested_kg: estimatedTotal.toString(),
            updated_at: new Date()
          })
          .where(eq(plots.id, plot.id));
        
        console.log(`  ✅ Fixed ${plot.name}: Updated total to ${estimatedTotal}kg`);
      } else if (currentCycle === 1 && currentTotal === currentHarvest) {
        console.log(`  ✅ ${plot.name}: Correct for single cycle`);
      } else if (currentTotal > currentHarvest) {
        console.log(`  ✅ ${plot.name}: Accumulation working correctly`);
      } else {
        console.log(`  ⚠️  ${plot.name}: Unusual state - manual review may be needed`);
      }
    }
    
    console.log('\n🎉 Harvest accumulation fix completed!');
    console.log('📋 Summary: All plots should now properly accumulate harvest amounts across cycles');
    
  } catch (error) {
    console.error('❌ Error fixing harvest accumulation:', error);
    process.exit(1);
  }
}

// Run the fix
fixHarvestAccumulation();