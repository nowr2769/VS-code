import argparse
import random


def generate_lotto_numbers(count=6, minimum=1, maximum=45):
    if count < 1:
        raise ValueError("Number of lotto numbers must be at least 1")
    if count > (maximum - minimum + 1):
        raise ValueError("Requested count exceeds the available number range")

    return sorted(random.sample(range(minimum, maximum + 1), count))


def main():
    parser = argparse.ArgumentParser(description="Generate lottery numbers")
    parser.add_argument("-n", "--count", type=int, default=1, help="How many sets to generate")
    parser.add_argument("-m", "--numbers", type=int, default=6, help="How many numbers per set")
    args = parser.parse_args()

    for i in range(1, args.count + 1):
        numbers = generate_lotto_numbers(args.numbers)
        print(f"{i}회차: {numbers}")


if __name__ == "__main__":
    main()
