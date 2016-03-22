import csv
import os.path
from sys import argv

from collections import defaultdict

PREFIX = 'ca'

HOMES_FILE = 'home_locations_ref.txt'
PERSON_FILE = 'persons_ref.txt'
ZIP_COUNTY_FILE = 'zip_county.csv'

# OUTPUT_FILE = 'population.csv'
COUNTY_FILE = 'county_pop.csv'


def file_path(name):
    return '../data/'+PREFIX+ name

homes = dict()
zip2county = dict()
pop = defaultdict(int)
missing = defaultdict(int)

if len(argv) == 2:
    PREFIX = argv[1]

if PREFIX[-1] != '-':
    PREFIX += '-'

with open(file_path(HOMES_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for row in f:
        homes[row[0]] = (row[9], row[8], row[7])

with open(ZIP_COUNTY_FILE, 'rb') as zipfile:
    f = csv.reader(zipfile)
    f.next()
    for row in f:
        zip2county[row[0]] = row[1]


with open(file_path(PERSON_FILE), 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for row in f:
        h = homes[row[3]]
        if h[2] in zip2county:
            county = zip2county[h[2]]
            pop[county] += 1
        else:
            missing[h[2]] += 1
print 'missing:', missing


# with open(file_path(OUTPUT_FILE), 'wb') as ofile:
#     o = csv.writer(ofile)
#     o.writerow(['lat', 'lon'])
#
#     with open(file_path(PERSON_FILE), 'rb') as csvfile:
#         f = csv.reader(csvfile, delimiter=' ')
#         f.next()
#         for row in f:
#             h = homes[row[3]]
#             o.writerow([h[0], h[1]])
#             if h[2] in zip2county:
#                 county = zip2county[h[2]]
#                 pop[county] += 1
#             else:
#                 missing[h[2]] += 1
#     print 'missing:', missing

with open('../map/assets/'+PREFIX+COUNTY_FILE, 'wb') as cfile:
    o = csv.writer(cfile)
    o.writerow(['county', 'pop'])
    o.writerows(pop.items())







