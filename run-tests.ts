import { runPIDControllerTests } from './src/physics/PIDController.test';
import { runLDrawParserTests } from './src/parsers/LDrawParser.test';
import { runRigBuilderTests } from './src/core/RigBuilder.test';
import { runSensorSimulatorsTests } from './src/physics/SensorSimulators.test';

async function main() {
  console.log('Starting test runner...');
  const results = [];
  results.push(runPIDControllerTests());
  results.push(runLDrawParserTests());
  results.push(runRigBuilderTests());
  results.push(runSensorSimulatorsTests());
  
  // More test suites can be added here in the future
  
  const allPassed = results.every(result => result);

  if (allPassed) {
    console.log('\n✅ All test suites passed!');
    process.exit(0);
  } else {
    console.error('\n❌ Some test suites failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nCritical error in test runner:', err);
  process.exit(1);
});
