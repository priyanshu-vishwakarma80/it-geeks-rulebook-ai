"""
Standalone CLI Benchmark Evaluation Runner.
Executes the test suite across all 25 unanswerable questions,
the 3 planted contradictions, and positive answerable queries.
Prints a terminal scorecard table.
"""

import sys
from pathlib import Path

# Ensure root directory is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.main import run_evaluation_benchmark


def main():
    print("\n" + "=" * 75)
    print("  RUNNING AUTOMATED EVALUATION BENCHMARK - RULEBOOK Q&A ENGINE")
    print("=" * 75 + "\n")

    summary = run_evaluation_benchmark()

    print(f"Total Tests Executed: {summary.total_tests}")
    print(f"Passed Tests:         {summary.passed_tests}  [PASS]")
    print(f"Failed Tests:         {summary.failed_tests}  [FAIL]")
    print(f"Overall Accuracy:     {summary.accuracy_percentage}%\n")

    print("-" * 75)
    print(f"{'TEST ID':<20} | {'EXPECTED':<12} | {'PREDICTED':<12} | {'RESULT':<8}")
    print("-" * 75)
    for r in summary.results:
        status_str = "[PASS]" if r.passed else "[FAIL]"
        print(f"{r.test_id:<20} | {r.expected_type.value:<12} | {r.predicted_type.value:<12} | {status_str:<8}")
    print("-" * 75)

    print("\nCategorical Breakdown:")
    for cat, acc in summary.breakdown.items():
        print(f"  - {cat.replace('_', ' ').title()}: {acc}%")

    print("\n" + "=" * 75)
    if summary.failed_tests == 0:
        print("  ALL TESTS PASSED WITH 100% PRECISION AND ACCURACY! READY FOR SUBMISSION.")
    else:
        print(f"  FAILED ON {summary.failed_tests} TESTS.")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
