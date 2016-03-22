import csv
import time
from collections import defaultdict

people = dict()
pop = defaultdict(int)
missing = defaultdict(int)

AGE_GROUPS = [1, 6, 13, 19, 64]
AGE_GROUPS_LEN = len(AGE_GROUPS)
def age_group(age):
    for i in range(AGE_GROUPS_LEN):
        if age < AGE_GROUPS[i]:
            return i
    else:
        return AGE_GROUPS_LEN

# t0 = time.clock()
# n = 0
# with open("/Users/yarden/data/episim/W/persons_ref.txt", 'rb') as csvfile:
#     f = csv.reader(csvfile, delimiter=' ')
#     f.next()
#     for person in f:
#         n += 1
#         if n % 1000000 == 0:
#             print n
#         if n == 1000000:
#             break
#         p_zip = person[2]
#         people[person[0]] = (age_group(int(person[1])), p_zip)
#         # c = zip2county[p_zip]
#         # if c != '':
#         #     pop[c] += 1
#         # else:
#         #     missing[p_zip] += 1
#
# t1 = time.clock()
# print '\t',n,'records in',(t1-t0),' secs'


tmp = []
t0 = time.clock()
n = 0
keys = [0]*10000000
values = [0]*10000000

with open("/Users/yarden/data/episim/W/persons_ref.txt", 'rb') as csvfile:
    f = csv.reader(csvfile, delimiter=' ')
    f.next()
    for person in f:
        n += 1
        if n % 10000000 == 0:
            print n
            if n == 60000000:
                break
        p_zip = person[2]
        keys[n] = person[0]
        # values[n] = [(age_group(int(person[1])), p_zip)]

        # p_zip = person[2]
        # tmp.append([person[0], (age_group(int(person[1])), p_zip)])
        # c = zip2county[p_zip]
        # if c != '':
        #     pop[c] += 1
        # else:
        #     missing[p_zip] += 1

t1 = time.clock()
print '\t',n,'records in',(t1-t0),' secs'

# d = dict.fromkeys(keys, values)
# t2 = time.clock()
# print '\t',n,'records in',(t2-t1),' secs'
# p = None
# print '\t',n,'records in',(time.clock()-t2),' secs'